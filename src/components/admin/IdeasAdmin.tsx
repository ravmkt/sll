import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import SortTh, { type Sort } from '@/components/common/SortTh';
import { MODULES, STATUS_LABEL, STATUS_ORDER, adminList, sortBy, updateRequest, type AdminRow, type ReqStatus } from '@/services/requests';
import { showError } from '@/utils/toast';

const SEL = 'cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-amber-500';

const get = (r: AdminRow, k: string): string | number =>
  k === 'votes' ? r.votes : k === 'status' ? STATUS_ORDER.indexOf(r.status) : k === 'date' ? r.created_at
  : k === 'hidden' ? Number(!r.hidden) : k === 'store' ? r.store_name ?? '' : k === 'module' ? r.module : k === 'category' ? r.category : r.title;

export default function IdeasAdmin() {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [sort, setSort] = useState<Sort>({ key: 'votes', dir: 'desc' });

  const load = useCallback(async () => {
    try { setRows(await adminList()); } catch (e: any) { showError(e?.message || 'Erro ao carregar'); setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const patch = async (id: string, p: Partial<AdminRow>) => {
    setRows((l) => l && l.map((r) => (r.id === id ? { ...r, ...p } : r)));
    try { await updateRequest(id, p as any); } catch (e: any) { showError(e?.message || 'Erro ao salvar'); void load(); }
  };

  const sorted = useMemo(() => (rows ? sortBy(rows, (r) => get(r, sort.key), sort.dir) : []), [rows, sort]);

  return (
    <div>
      <div className="mb-3">
        <h4 className="text-sm font-bold text-slate-100">Pedidos dos lojistas {rows ? `(${rows.length})` : ''}</h4>
        <p className="text-xs text-slate-400">Clique no título da coluna para ordenar. Alterações de módulo, descrição, status e visibilidade são salvas na hora.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-800/60">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-700/80">
            <tr>
              <SortTh label="Loja" k="store" sort={sort} onSort={setSort} />
              <SortTh label="Módulo" k="module" sort={sort} onSort={setSort} />
              <SortTh label="Categoria" k="category" sort={sort} onSort={setSort} />
              <SortTh label="Descrição" k="title" sort={sort} onSort={setSort} />
              <SortTh label="Votos" k="votes" sort={sort} onSort={setSort} align="center" />
              <SortTh label="Status" k="status" sort={sort} onSort={setSort} />
              <SortTh label="Visível" k="hidden" sort={sort} onSort={setSort} align="center" />
              <SortTh label="Data" k="date" sort={sort} onSort={setSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {!rows && <tr><td colSpan={8} className="py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-slate-400" /></td></tr>}
            {rows && sorted.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Nenhum pedido.</td></tr>}
            {sorted.map((r) => (
              <tr key={r.id} className={`align-top hover:bg-white/5 ${r.hidden ? 'opacity-50' : ''}`}>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{r.store_name ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <select value={r.module} onChange={(e) => patch(r.id, { module: e.target.value })} className={SEL}>
                    {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{r.category}</td>
                <td className="min-w-[300px] px-3 py-2.5">
                  <textarea key={r.title} defaultValue={r.title} rows={2}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v.length >= 3 && v !== r.title) void patch(r.id, { title: v }); }}
                    className="w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs text-slate-100 outline-none hover:border-slate-700 focus:border-amber-500" />
                </td>
                <td className="px-3 py-2.5 text-center text-base font-black text-amber-400">{r.votes}</td>
                <td className="px-3 py-2.5">
                  <select value={r.status} onChange={(e) => patch(r.id, { status: e.target.value as ReqStatus })} className={SEL}>
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <input type="checkbox" checked={!r.hidden} onChange={(e) => patch(r.id, { hidden: !e.target.checked })} className="h-4 w-4 cursor-pointer" />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}