import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Image as ImageIcon, FileText, Trash2, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentStoreId } from '@/modules/builder/services/pages';
import StorageUsageCard from '@/components/billing/StorageUsageCard';

type FileRow = {
  id: string; bucket: string; module: string; name: string; title?: string | null;
  vid_id?: string | null; bytes: number; created_at: string | null;
  thumb_path?: string | null; in_use?: boolean; used_in?: { t: string; l: string | null }[];
};
type Usage = { used_bytes: number; limit_bytes: number | null };
type Sort = 'size' | 'date';
type UseFilter = 'all' | 'unused' | 'used';

const MB = 1024 * 1024;
const GB = 1024 * MB;
const fmt = (n: number) => (n >= GB ? `${(n / GB).toFixed(2).replace('.', ',')} GB` : `${(n / MB).toFixed(1).replace('.', ',')} MB`);

const isVid = (n: string) => /\.(mp4|webm|mov|m4v)$/i.test(n);
const isImg = (n: string) => /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(n);
const isHtml = (n: string) => /\.html?$/i.test(n);
const pub = (bucket: string, path: string): string =>
  (supabase as any).storage.from(bucket).getPublicUrl(path).data.publicUrl as string;

const canDelete = (f: FileRow) => f.module === 'Vidlytics' || f.module === 'Stream Sell' || (f.module === 'Builder' && f.bucket === 'builder-assets');
const reason = (f: FileRow) => (f.module === 'Loja' ? 'Em uso pela loja' : f.bucket === 'builder-pages' ? 'Exclua a página no Builder' : 'Indisponível');

async function removeFile(f: FileRow): Promise<void> {
  const sb = supabase as any;
  const paths = [f.id];
  if (f.thumb_path) paths.push(f.thumb_path);
  const r = await sb.storage.from(f.bucket).remove(paths);
  if (r.error) throw new Error(r.error.message);
  if (!r.data || r.data.length === 0) throw new Error('Não foi possível excluir: sem permissão no armazenamento.');

  if (f.vid_id) {
    const d = await sb.schema('vidlytics').from('vid_videos').delete().eq('id', f.vid_id).select('id');
    if (d.error) throw new Error(d.error.message);
  }
}

const kind = (t: string) =>
  /live|stream/i.test(t) ? 'Live'
  : /stor(y|ies)/i.test(t) ? 'Story'
  : /vid_|video/i.test(t) ? 'Vídeo'
  : /page|builder/i.test(t) ? 'Página'
  : /product/i.test(t) ? 'Produto'
  : t.replace(/_/g, ' ');
const usedText = (f: FileRow) =>
  (f.used_in ?? []).map((u) => (u.l ? `${kind(u.t)}: ${u.l}` : kind(u.t))).join(' · ');

function Thumb({ f }: { f: FileRow }) {
  const [imgFail, setImgFail] = useState(false);
  const [vidFail, setVidFail] = useState(false);
  const vid = isVid(f.name);
  const imgSrc = f.thumb_path ? pub(f.bucket, f.thumb_path) : isImg(f.name) ? pub(f.bucket, f.id) : null;
  const Icon = vid ? Film : isHtml(f.name) ? FileText : ImageIcon;

  let inner: JSX.Element;
  if (imgSrc && !imgFail) {
    inner = <img src={imgSrc} alt="" loading="lazy" onError={() => setImgFail(true)} className="h-full w-full object-cover" />;
  } else if (vid && !vidFail) {
    inner = (
      <video
        src={`${pub(f.bucket, f.id)}#t=0.5`}
        preload="metadata"
        muted
        playsInline
        onError={() => setVidFail(true)}
        className="h-full w-full object-cover"
      />
    );
  } else {
    inner = <Icon className="h-6 w-6 text-slate-400" />;
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
      {inner}
    </div>
  );
}

export default function MeuPlanoPage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [useFilter, setUseFilter] = useState<UseFilter>('all');
  const [sort, setSort] = useState<Sort>('size');
  const [target, setTarget] = useState<FileRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ver, setVer] = useState(0);

  const load = useCallback(async () => {
    try {
      const id = await getCurrentStoreId();
      setStoreId(id);
      const sb = supabase as any;
      const [l, u] = await Promise.all([
        sb.rpc('store_files_list', { p_store: id }),
        sb.rpc('store_storage_usage', { p_store: id }),
      ]);
      if (l.error) throw l.error;
      setFiles(((l.data?.files ?? []) as FileRow[]).filter((f) => Number(f.bytes) > 0));
      if (!u.error) setUsage(u.data as Usage);
      setVer((x) => x + 1);
    } catch (e: any) {
      setFiles([]);
      setMsg({ ok: false, text: 'Não foi possível carregar seus arquivos: ' + (e?.message || 'erro desconhecido') });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const modules = useMemo(() => Array.from(new Set((files ?? []).map((f) => f.module))), [files]);

  const unused = useMemo(() => (files ?? []).filter((f) => !f.in_use && canDelete(f)), [files]);
  const unusedBytes = useMemo(() => unused.reduce((s, f) => s + Number(f.bytes), 0), [unused]);

  const list = useMemo(() => {
    const base = (files ?? []).filter((f) =>
      (filter === 'all' || f.module === filter) &&
      (useFilter === 'all' || (useFilter === 'used' ? f.in_use : !f.in_use)),
    );
    return [...base].sort((a, b) =>
      sort === 'size'
        ? b.bytes - a.bytes
        : new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
  }, [files, filter, useFilter, sort]);

  const confirmDelete = async () => {
    if (!target || !storeId) return;
    setBusy(true);
    setMsg(null);
    try {
      await removeFile(target);
      if (target.bucket === 'builder-assets') {
        await (supabase as any).rpc('refresh_builder_storage', { p_store: storeId });
      }
      setMsg({ ok: true, text: `"${target.title || target.name}" foi excluído.` });
      setTarget(null);
      await load();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Falha ao excluir.' });
    } finally {
      setBusy(false);
    }
  };

  const pct = usage?.limit_bytes ? (usage.used_bytes / usage.limit_bytes) * 100 : 0;
  const chip = (k: string, label: string) => (
    <button
      key={k}
      type="button"
      onClick={() => setFilter(k)}
      className={`rounded-full px-3 py-1 text-xs font-bold transition ${filter === k ? 'bg-[#0094eb] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
    >
      {label}
    </button>
  );
  const selCls = 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Meu plano</h1>
        <p className="text-sm text-slate-500">Veja quanto você já usa do seu plano em toda a plataforma e libere espaço excluindo arquivos.</p>
      </div>

      <StorageUsageCard key={ver} />

      {pct >= 80 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Você usou {pct.toFixed(0)}% do armazenamento.
          </span>
          <Link to="/dashboard/planos" className="rounded-lg bg-[#0094eb] px-4 py-2 text-xs font-bold text-white">Fazer upgrade</Link>
        </div>
      )}

      {msg && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${msg.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a1f2c]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">{chip('all', 'Todos')}{modules.map((m) => chip(m, m))}</div>
          <div className="flex gap-2">
            <select value={useFilter} onChange={(e) => setUseFilter(e.target.value as UseFilter)} className={selCls}>
              <option value="all">Todos os usos</option>
              <option value="unused">Sem uso</option>
              <option value="used">Em uso</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selCls}>
              <option value="size">Maiores primeiro</option>
              <option value="date">Mais recentes</option>
            </select>
          </div>
        </div>

        {unused.length > 0 && (
          <p className="mb-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {unused.length} arquivo(s) sem uso ocupam <strong>{fmt(unusedBytes)}</strong>. Você pode excluí-los para liberar espaço.
          </p>
        )}

        {files === null ? (
          <p className="py-6 text-center text-sm text-slate-500">Carregando arquivos...</p>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhum arquivo encontrado.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((f) => {
              const openable = !isHtml(f.name);
              const url = pub(f.bucket, f.id);
              const label = f.title || f.name;
              return (
                <li key={`${f.bucket}:${f.id}`} className="flex items-center gap-3 py-2.5">
                  {openable ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba">
                      <Thumb f={f} />
                    </a>
                  ) : (
                    <Thumb f={f} />
                  )}
                  <div className="min-w-0 flex-1">
                    {openable ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 truncate text-sm font-semibold text-slate-800 hover:text-[#0094eb] dark:text-slate-100"
                        title="Abrir em nova aba"
                      >
                        <span className="truncate">{label}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                      </a>
                    ) : (
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                    )}
                    {f.used_in && f.used_in.length > 0 && (<p className="truncate text-xs font-medium text-emerald-700" title={usedText(f)}>Usado em: {usedText(f)}</p>)}
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>
                        {f.module}
                        {f.created_at ? ` · ${new Date(f.created_at).toLocaleDateString('pt-BR')}` : ''}
                      </span>
                      {f.in_use ? (
                        <span
                          className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                          title={f.used_in && f.used_in.length ? `Usado em: ${usedText(f)}` : 'Em uso pela loja'}
                        >
                          Em uso
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Sem uso
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(Number(f.bytes))}</span>
                  {canDelete(f) ? (
                    <button
                      type="button"
                      onClick={() => setTarget(f)}
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  ) : (
                    <span className="w-28 text-right text-[11px] text-slate-400">{reason(f)}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {target && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-[#1a1f2c]">
            <h2 className="text-base font-black text-slate-900 dark:text-white">Excluir arquivo?</h2>
            <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">
              <strong>{target.title || target.name}</strong> ({fmt(Number(target.bytes))}) será removido para sempre.
            </p>
            {target.in_use ? (
              <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">
                Este arquivo está em uso{target.used_in && target.used_in.length ? ` (${usedText(target)})` : ''}. Ao excluir, ele deixará de aparecer onde estiver publicado.
              </p>
            ) : (
              <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
                Este arquivo não está em uso. Pode excluir com segurança.
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancelar</button>
              <button type="button" disabled={busy} onClick={confirmDelete} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}