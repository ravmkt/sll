import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Send, ThumbsUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useLoja } from '@/contexts/LojaContext';
import SortTh, { type Sort } from '@/components/common/SortTh';
import { STATUS_CLS, STATUS_LABEL, STATUS_ORDER, boardList, sortBy, toggleVote, MODULES, type BoardRow } from '@/services/requests';
import { showError, showSuccess } from '@/utils/toast';
import { AppModal } from '@/components/common/AppModal';
import { supabase } from '@/lib/supabase';

const LONG = 140;

const SUG_CATEGORIES = ['Novo m\u00f3dulo', 'Integra\u00e7\u00e3o com plataforma', 'Relat\u00f3rios e m\u00e9tricas', 'Automa\u00e7\u00e3o e IA', 'Outro'];
const SUG_FIELD = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0088ff] focus:ring-2 focus:ring-sky-100';

const get = (r: BoardRow, k: string): string | number =>
  k === 'votes' ? r.votes : k === 'status' ? STATUS_ORDER.indexOf(r.status) : k === 'module' ? r.module : k === 'category' ? r.category : r.title;

export default function IdeasBoard() {
  const { storeId } = useLoja() as { storeId: string | null };
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [sort, setSort] = useState<Sort>({ key: 'votes', dir: 'desc' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [sugOpen, setSugOpen] = useState(false);
  const [sugModule, setSugModule] = useState(MODULES[0]);
  const [sugCategory, setSugCategory] = useState(SUG_CATEGORIES[0]);
  const [sugText, setSugText] = useState('');
  const [sugBusy, setSugBusy] = useState(false);
  const [sugErr, setSugErr] = useState('');

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

  const closeSug = () => { if (!sugBusy) { setSugOpen(false); setSugErr(''); } };

  const sendSug = async () => {
    if (!storeId || sugText.trim().length < 5 || sugBusy) return;
    setSugBusy(true);
    setSugErr('');
    const sb: any = supabase;
    const { data: u } = await sb.auth.getUser();
    const row: any = {
      type: 'suggestion',
      store_id: storeId,
      comment: ('[' + sugCategory + '] ' + sugText.trim()).slice(0, 2000),
      payload: { module: sugModule },
      user_id: u?.user?.id ?? null,
    };
    let { error } = await sb.from('app_feedbacks').insert(row);
    if (error && /user_id/.test(String(error.message))) {
      delete row.user_id;
      ({ error } = await sb.from('app_feedbacks').insert(row));
    }
    setSugBusy(false);
    if (error) { setSugErr('N\u00e3o foi poss\u00edvel enviar. Tente de novo.'); return; }
    setSugOpen(false);
    setSugText('');
    showSuccess('Obrigado! Sua ideia foi enviada ao time.');
    void load();
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
        <div className="flex flex-wrap items-start justify-between gap-3"><div>
          <h1 className="text-2xl font-black text-slate-900">Pedidos dos lojistas</h1>
          <p className="mt-1 text-sm text-slate-500">Veja o que outras lojas pediram e vote no que também faria diferença para você. Os mais votados entram primeiro na fila.</p>
        </div><button type="button" onClick={() => setSugOpen(true)} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#0088ff] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-[#0077e6]"><Plus className="h-4 w-4" /> Sugerir ideia</button></div>

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
        <DialogContent className="max-w-lg border-slate-200 bg-white text-slate-900">
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
    <AppModal
        open={sugOpen}
        title="SUGERIR IDEIA"
        maxWidth="max-w-lg"
        busy={sugBusy}
        onClose={closeSug}
        footer={
          <>
            <button type="button" onClick={closeSug} disabled={sugBusy} className="flex-1 cursor-pointer rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={sendSug} disabled={sugBusy || sugText.trim().length < 5} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0088ff] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-[#0077e6] disabled:cursor-not-allowed disabled:opacity-50">
              {sugBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar pedido
            </button>
          </>
        }
      >
        <div className="w-full space-y-3">
          <p className="text-center text-xs text-slate-500">{"O que voc\u00ea gostaria de ver no SLL Hub? Sua sugest\u00e3o define os pr\u00f3ximos m\u00f3dulos."}</p>
          <label className="block space-y-1.5 text-xs font-bold text-slate-600">{"1. M\u00f3dulo"}
            <select value={sugModule} onChange={(e) => setSugModule(e.target.value)} className={SUG_FIELD + ' font-normal'}>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-slate-600">2. Categoria
            <select value={sugCategory} onChange={(e) => setSugCategory(e.target.value)} className={SUG_FIELD + ' font-normal'}>
              {SUG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-slate-600">3. Seu pedido
            <textarea value={sugText} onChange={(e) => setSugText(e.target.value)} maxLength={500} rows={5} placeholder="Descreva o que ajudaria sua loja..." className={SUG_FIELD + ' resize-none font-normal'} />
            <span className="block text-right text-[10px] font-normal text-slate-400">{sugText.length}/500</span>
          </label>
          {sugErr && <p className="text-xs font-semibold text-rose-600">{sugErr}</p>}
        </div>
      </AppModal>
    </DashboardLayout>
  );
}