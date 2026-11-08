import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Image as ImageIcon, FileText, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentStoreId } from '@/modules/builder/services/pages';
import StorageUsageCard from '@/components/billing/StorageUsageCard';

type FileRow = {
  id: string; bucket: string; module: string; name: string; title?: string | null;
  vid_id?: string | null; bytes: number; created_at: string | null;
};
type Usage = { used_bytes: number; limit_bytes: number | null };
type Sort = 'size' | 'date';

const MB = 1024 * 1024;
const GB = 1024 * MB;
const fmt = (n: number) => (n >= GB ? `${(n / GB).toFixed(2).replace('.', ',')} GB` : `${(n / MB).toFixed(1).replace('.', ',')} MB`);

const canDelete = (f: FileRow) => f.module === 'Vidlytics' || f.module === 'Stream Sell' || (f.module === 'Builder' && f.bucket === 'builder-assets');
const reason = (f: FileRow) => (f.module === 'Loja' ? 'Em uso pela loja' : f.bucket === 'builder-pages' ? 'Exclua a página no Builder' : 'Indisponível');

async function removeFile(f: FileRow, storeId: string): Promise<void> {
  const sb = supabase as any;
  const paths = [f.id];
  if (f.bucket === 'videos' && f.module === 'Vidlytics' && !f.id.includes('/thumbnails/')) {
    paths.push(`${storeId}/thumbnails/${f.name.replace(/\.[^.]*$/, '')}_thumb.jpg`);
  }
  const r = await sb.storage.from(f.bucket).remove(paths);
  if (r.error) throw new Error(r.error.message);
  if (!r.data || r.data.length === 0) throw new Error('Não foi possível excluir: sem permissão no armazenamento.');

  if (f.vid_id) {
    const d = await sb.schema('vidlytics').from('vid_videos').delete().eq('id', f.vid_id).select('id');
    if (d.error) throw new Error(d.error.message);
  }
  if (f.bucket === 'builder-assets') await sb.rpc('refresh_builder_storage', { p_store: storeId });
}

export default function MeuPlanoPage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [filter, setFilter] = useState<string>('all');
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
    } catch {
      setFiles([]);
      setMsg({ ok: false, text: 'Não foi possível carregar seus arquivos.' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const modules = useMemo(() => Array.from(new Set((files ?? []).map((f) => f.module))), [files]);

  const list = useMemo(() => {
    const base = (files ?? []).filter((f) => filter === 'all' || f.module === filter);
    return [...base].sort((a, b) =>
      sort === 'size'
        ? b.bytes - a.bytes
        : new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
  }, [files, filter, sort]);

  const confirmDelete = async () => {
    if (!target || !storeId) return;
    setBusy(true);
    setMsg(null);
    try {
      await removeFile(target, storeId);
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
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="size">Maiores primeiro</option>
            <option value="date">Mais recentes</option>
          </select>
        </div>

        {files === null ? (
          <p className="py-6 text-center text-sm text-slate-500">Carregando arquivos...</p>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhum arquivo ocupando espaço.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((f) => {
              const Icon = /\.(mp4|webm|mov)$/i.test(f.name) ? Film : /\.html?$/i.test(f.name) ? FileText : ImageIcon;
              return (
                <li key={`${f.bucket}:${f.id}`} className="flex items-center gap-3 py-2.5">
                  <Icon className="h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{f.title || f.name}</p>
                    <p className="text-xs text-slate-500">
                      {f.module}
                      {f.created_at ? ` · ${new Date(f.created_at).toLocaleDateString('pt-BR')}` : ''}
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
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              Se este arquivo estiver em uma página, widget ou vídeo publicado, ele deixará de aparecer lá.
            </p>
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