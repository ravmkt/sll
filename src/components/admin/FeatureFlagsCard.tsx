import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Flag, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminListStores, type AdminStoreRow } from '@/services/admin/adminMaster';
import { deleteFlag, listFlags, saveFlag, setFlagStore, type FeatureFlag, type FlagMode } from '@/services/admin/flagsService';
import { CARD, INPUT } from '@/components/admin/moduleUi';

const MODE_LABEL: Record<FlagMode, string> = { off: 'Desligada', stores: 'Beta (lojas selecionadas)', all: 'Todas as lojas' };
const MODE_STYLE: Record<FlagMode, string> = {
  off: 'bg-slate-500/15 text-slate-400',
  stores: 'bg-violet-500/15 text-violet-300',
  all: 'bg-emerald-500/15 text-emerald-300',
};

function FlagItem({ f, onChanged }: { f: FeatureFlag; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminStoreRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const h = setTimeout(() => {
      adminListStores(search.trim(), '', 6, 0).then((r) => setResults(r.rows)).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(h);
  }, [search]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); onChanged(); }
    catch (e: any) { toast.error(e?.message || 'Erro ao salvar.'); }
    finally { setBusy(false); }
  };

  const changeMode = (mode: FlagMode) =>
    run(() => saveFlag(f.id, f.module_slug, f.key, f.name, f.description || '', mode), 'Flag atualizada.');

  const remove = () => {
    if (!window.confirm(`Excluir a flag "${f.name}"?`)) return;
    run(() => deleteFlag(f.id), 'Flag excluída.');
  };

  const inFlag = new Set(f.stores.map((s) => s.id));

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
          <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} />
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold text-white">{f.name}</span>
            <span className="block truncate font-mono text-[10px] text-slate-600">{f.key}{f.mode === 'stores' ? ` · ${f.stores.length} loja(s)` : ''}</span>
          </span>
        </button>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${MODE_STYLE[f.mode]}`}>{f.mode === 'stores' ? 'Beta' : MODE_LABEL[f.mode]}</span>
      </div>

      {open && (
        <div className="mt-3 space-y-3 pl-6">
          {f.description && <p className="text-[11px] text-slate-500">{f.description}</p>}
          <div className="flex items-center gap-2">
            <select value={f.mode} disabled={busy} onChange={(e) => changeMode(e.target.value as FlagMode)} className={`${INPUT} flex-1`}>
              {(Object.keys(MODE_LABEL) as FlagMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
            </select>
            <button type="button" disabled={busy} onClick={remove} className="cursor-pointer text-slate-600 hover:text-rose-300 disabled:opacity-40" title="Excluir"><Trash2 size={14} /></button>
          </div>

          {f.mode === 'stores' && (
            <div className="space-y-2">
              {f.stores.length === 0 ? (
                <p className="text-[11px] text-slate-500">Nenhuma loja no beta ainda.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {f.stores.map((s) => (
                    <li key={s.id} className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] text-violet-200">
                      {s.name || 'Sem nome'}
                      <button type="button" disabled={busy} onClick={() => run(() => setFlagStore(f.id, s.id, false))} className="cursor-pointer hover:text-white"><X size={11} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar loja para adicionar…" className={INPUT} />
              {results.length > 0 && (
                <ul className="divide-y divide-white/5 rounded-lg border border-slate-800">
                  {results.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={busy || inFlag.has(s.id)}
                        onClick={() => run(() => setFlagStore(f.id, s.id, true)).then(() => { setSearch(''); setResults([]); })}
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="truncate">{s.name}</span>
                        <span className="shrink-0 text-[10px] text-slate-500">{inFlag.has(s.id) ? 'já adicionada' : 'adicionar'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function FeatureFlagsCard({ slug }: { slug: string }) {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setFlags(await listFlags(slug)); }
    catch (e: any) { toast.error(e?.message || 'Erro ao carregar as flags.'); setFlags([]); }
  }, [slug]);

  useEffect(() => { setFlags(null); load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      await saveFlag(null, slug, key, name, desc, 'stores');
      toast.success('Flag criada em modo Beta.');
      setKey(''); setName(''); setDesc(''); setAdding(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível criar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${CARD} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-white"><Flag size={14} className="text-[#fd8539]" /> Feature flags</p>
        <button type="button" onClick={() => setAdding((a) => !a)} className="flex cursor-pointer items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10">
          <Plus size={12} /> Nova
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-xl bg-white/[0.03] p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex.: Novo player)" className={INPUT} />
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="chave_tecnica (ex.: novo_player)" className={`${INPUT} font-mono`} />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (opcional)" className={INPUT} />
          <button type="button" disabled={busy || !name.trim() || !key.trim()} onClick={create} className="w-full cursor-pointer rounded-lg bg-[#fd8539] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">
            {busy ? 'Criando…' : 'Criar flag'}
          </button>
        </div>
      )}

      {flags === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : flags.length === 0 ? (
        <p className="text-xs text-slate-500">Nenhuma flag neste módulo. Crie uma para liberar um recurso beta.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {flags.map((f) => <FlagItem key={f.id} f={f} onChanged={load} />)}
        </ul>
      )}
    </div>
  );
}