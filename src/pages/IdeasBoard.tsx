import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, ThumbsUp } from 'lucide-react';
import { resolveStoreId } from '@/services/feedback';
import { IDEA_STATUS, listIdeas, toggleIdeaVote, type Idea, type IdeaStatus } from '@/services/ideas';
import { showError } from '@/utils/toast';

type Tab = 'all' | Exclude<IdeaStatus, 'hidden' | 'received'>;
const TABS: { v: Tab; label: string }[] = [
  { v: 'all', label: 'Todas' },
  { v: 'analysis', label: 'Em análise' },
  { v: 'planned', label: 'Planejado' },
  { v: 'in_progress', label: 'Em desenvolvimento' },
  { v: 'done', label: 'Entregue' },
];

export default function IdeasBoard() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [items, setItems] = useState<Idea[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<'votes' | 'recent'>('votes');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async (id: string) => {
    try { setItems(await listIdeas(id)); } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar ideias'); }
  }, []);

  useEffect(() => {
    (async () => {
      try { const id = await resolveStoreId(); setStoreId(id); await load(id); }
      catch (e: any) { setErr(e?.message ?? 'Erro ao carregar ideias'); }
    })();
  }, [load]);

  const vote = async (i: Idea) => {
    if (!storeId || busy) return;
    setBusy(i.id);
    setItems((prev) => (prev ?? []).map((x) => (x.id === i.id ? { ...x, voted: !x.voted, votes: x.votes + (x.voted ? -1 : 1) } : x)));
    try { await toggleIdeaVote(i.id, storeId); }
    catch { showError('Não foi possível registrar seu voto.'); await load(storeId); }
    finally { setBusy(null); }
  };

  const list = useMemo(() => {
    const f = (items ?? []).filter((i) => tab === 'all' || i.status === tab);
    return [...f].sort((a, b) => (sort === 'votes' ? b.votes - a.votes : 0) || b.created_at.localeCompare(a.created_at));
  }, [items, tab, sort]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <button type="button" onClick={() => window.history.back()} className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <div>
        <h1 className="text-2xl font-black text-slate-900">O que a comunidade está pedindo</h1>
        <p className="text-sm text-slate-500">Vote nas ideias que você também quer ver no SLL Hub. As mais votadas ganham prioridade.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.v} type="button" onClick={() => setTab(t.v)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold ${tab === t.v ? 'bg-[#0094eb] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'votes' | 'recent')} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700">
          <option value="votes">Mais votadas</option>
          <option value="recent">Mais recentes</option>
        </select>
      </div>

      {err ? <p className="text-sm font-semibold text-rose-600">{err}</p>
        : !items ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        : list.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Nenhuma ideia nesta categoria.</p>
        : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {list.map((i) => (
              <li key={i.id} className="flex items-center gap-4 px-4 py-3">
                <button type="button" onClick={() => void vote(i)} aria-pressed={i.voted} title={i.voted ? 'Remover meu voto' : 'Curtir esta ideia'}
                  className={`flex w-14 shrink-0 cursor-pointer flex-col items-center rounded-xl border px-2 py-2 transition ${i.voted ? 'border-[#0094eb] bg-[#0094eb]/10 text-[#0094eb]' : 'border-slate-200 text-slate-500 hover:border-[#0094eb] hover:text-[#0094eb]'}`}>
                  <ThumbsUp className="h-4 w-4" />
                  <span className="mt-0.5 text-sm font-black">{i.votes}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{i.body}</p>
                  <p className="text-[11px] text-slate-500">{i.category}{i.mine ? ' · sua ideia' : ''} · {new Date(i.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${IDEA_STATUS[i.status].cls}`}>{IDEA_STATUS[i.status].label}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}