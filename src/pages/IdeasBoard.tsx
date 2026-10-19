import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ThumbsUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useLoja } from '@/contexts/LojaContext';
import SortTh, { type Sort } from '@/components/common/SortTh';
import { STATUS_CLS, STATUS_LABEL, STATUS_ORDER, boardList, sortBy, toggleVote, type BoardRow } from '@/services/requests';
import { showError } from '@/utils/toast';

const LONG = 140;

const get = (r: BoardRow, k: string): string | number =>
  k === 'votes' ? r.votes : k === 'status' ? STATUS_ORDER.indexOf(r.status) : k === 'module' ? r.module : k === 'category' ? r.category : r.title;

export default function IdeasBoard() {
  const { storeId } = useLoja() as { storeId: string | null };
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [sort, setSort] = useState<Sort>({ key: 'votes', dir: 'desc' });
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    try { setRows(await boardList(storeId)); } catch (e: any) { showError(e?.message || 'Erro ao carregar os pedidos'); setRows([]); }
  }, [storeId]);
  useEffect(() => { void load(); }, [load]);

  const vote = async (r: BoardRow) => {
    if (!storeId) return;
    setRows((p) => p && p.map((x) => (x.id === r.id ? { ...x, voted: !x.voted, votes: x.votes + (x.voted ? -1 : 1) } : x)));
    try { await toggleVote(r.id, storeId); } catch (e: any) { showError(e?.message || 'Erro ao votar'); void load(); }
  };

  const sorted = useMemo(() => (rows ? sortBy(rows, (r) => get(r, sort.key), sort.dir) : []), [rows, sort]);
  const open = rows?.find((r) => r.id === openId) ?? null;

  const VoteBtn = ({ r }: { r: BoardRow }) => (
    <button type="button" onClick={() => vote(r)} title={r.voted ? 'Remover meu voto' : 'Votar neste pedido'}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black transition ${r.voted ? 'border-[#0094eb] bg-[#0094eb] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]'}`}>
      <ThumbsUp className="h-3.5 w-3.5" /> {r.votes}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5 pb-16">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pedidos dos lojistas</h1>
          <p className="mt-1 text-sm text-slate-500">Veja o que outras lojas pediram e vote no que também faria diferença para você. Os mais votados entram primeiro na fila.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <SortTh label="Módulo" k="module" sort={sort} onSort={setSort} />
                <SortTh label="Categoria" k="category" sort={sort} onSort={setSort} />
                <SortTh label="Descrição" k="title" sort={sort} onSort={setSort} />
                <SortTh label="Vote" k="votes" sort={sort} onSort={setSort} align="center" />
                <SortTh label="Status" k="status" sort={sort} onSort={setSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!rows && <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#0094eb]" /></td></tr>}
              {rows && sorted.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-slate-400">Nenhum pedido ainda. Seja o primeiro a sugerir.</td></tr>}
              {sorted.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.module}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.category}</td>
                  <td className="min-w-[320px] max-w-[520px] px-3 py-3">
                    <button type="button" onClick={() => setOpenId(r.id)} className="block w-full cursor-pointer text-left" title="Abrir pedido completo">
                      <span className="line-clamp-3 whitespace-pre-wrap break-words font-medium text-slate-800">{r.title}</span>
                      {r.title.length > LONG && <span className="mt-1 block text-[11px] font-bold text-[#0094eb]">Ler pedido completo</span>}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center"><VoteBtn r={r} /></td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-lg font-black text-slate-900">Pedido de lojista</DialogTitle>
          <DialogDescription className="sr-only">Texto completo do pedido</DialogDescription>
          {open && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">{open.module}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">{open.category}</span>
                <span className={`rounded-full px-2.5 py-1 font-bold ${STATUS_CLS[open.status]}`}>{STATUS_LABEL[open.status]}</span>
                <span className="text-slate-400">{new Date(open.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{open.title}</p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <VoteBtn r={open} />
                <button type="button" onClick={() => setOpenId(null)} className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Fechar</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}