import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import ReviewModal from '../../components/widgets/ReviewModal';
import ReviewWidgetModal from '../../components/widgets/ReviewWidgetModal';
import { reviewsService } from '../../services/reviewsService';
import { TEMPLATES, type Review, type ReviewWidget } from '../../types/reviews';
import type { WidgetsCtx } from '../../types/widgets';

const COLS_W = 'grid-cols-[2fr_1.3fr_1.5fr_2fr_90px_80px]';
const COLS_R = 'grid-cols-[1.5fr_90px_90px_1.5fr_100px_130px]';
const SRC: Record<string, string> = { manual: 'Manual', store: 'Loja', google: 'Google' };
const ST: Record<string, { l: string; c: string }> = {
  approved: { l: 'Aprovada', c: 'bg-emerald-50 text-emerald-600' },
  pending: { l: 'Pendente', c: 'bg-amber-50 text-amber-600' },
  rejected: { l: 'Rejeitada', c: 'bg-red-50 text-red-600' },
};

export default function WidgetsReviewsPage({ ctx }: { ctx: WidgetsCtx }) {
  const svc = useMemo(() => reviewsService(ctx.supabase), [ctx.supabase]);
  const [tab, setTab] = useState<'widgets' | 'reviews'>('widgets');
  const [widgets, setWidgets] = useState<ReviewWidget[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editW, setEditW] = useState<ReviewWidget | 'new' | null>(null);
  const [editR, setEditR] = useState<Review | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [w, r] = await Promise.all([svc.widgetsList(ctx.storeId), svc.list(ctx.storeId)]);
      setWidgets(w); setReviews(r);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); }
    finally { setLoading(false); }
  }, [svc, ctx.storeId]);
  useEffect(() => { void load(); }, [load]);

  async function run(fn: () => Promise<unknown>) {
    try { setError(''); await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro.'); }
  }
  function toggleW(w: ReviewWidget) {
    if (!w.active && !w.placement?.selector?.trim()) { setError('Defina o elemento da loja antes de ativar (clique em editar).'); return; }
    void run(() => svc.widgetSetActive(ctx.storeId, w.id, !w.active));
  }
  function removeW(w: ReviewWidget) {
    if (window.confirm(`Excluir o widget "${w.name}"?`)) void run(() => svc.widgetDelete(ctx.storeId, w.id));
  }
  function removeR(r: Review) {
    if (window.confirm(`Excluir a avaliação de "${r.author_name}"?`)) void run(() => svc.remove(ctx.storeId, r.id));
  }

  const shown = reviews.filter((r) => filter === 'all' || r.status === filter);
  const pending = reviews.filter((r) => r.status === 'pending').length;
  const tabCls = (t: string) => `rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-[#0094EB]" />
            <h1 className="text-2xl font-extrabold text-slate-900">Reviews</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Avaliações de clientes na página de produto e na vitrine da loja.</p>
        </div>
        <button type="button" onClick={() => (tab === 'widgets' ? setEditW('new') : setEditR('new'))}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white">
          <Plus className="h-4 w-4" /> {tab === 'widgets' ? 'Criar widget' : 'Nova avaliação'}
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button type="button" className={tabCls('widgets')} onClick={() => setTab('widgets')}>Widgets</button>
        <button type="button" className={tabCls('reviews')} onClick={() => setTab('reviews')}>
          Avaliações{pending > 0 && <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] text-white">{pending}</span>}
        </button>
        {tab === 'reviews' && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <option value="all">Todas</option><option value="pending">Pendentes</option>
            <option value="approved">Aprovadas</option><option value="rejected">Rejeitadas</option>
          </select>
        )}
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {tab === 'widgets' && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className={`grid ${COLS_W} px-6 py-3 text-[11px] font-bold uppercase text-slate-500`}>
            <span>Nome</span><span>Onde</span><span>Modelo</span><span>Posição</span>
            <span className="text-center">Status</span><span className="text-right">Ações</span>
          </div>
          {loading && <div className="px-6 py-6 text-sm text-slate-400">Carregando...</div>}
          {!loading && widgets.length === 0 && <div className="px-6 py-6 text-sm text-slate-400">Nenhum widget criado. Clique em "Criar widget".</div>}
          {widgets.map((w) => (
            <div key={w.id} className={`grid ${COLS_W} items-center border-t border-slate-100 bg-slate-50/60 px-6 py-3.5`}>
              <span className="truncate pr-3 text-sm font-bold text-slate-900">{w.name}</span>
              <span className="text-sm text-slate-600">{w.scope === 'product' ? 'Produto' : 'Vitrine'}</span>
              <span className="truncate pr-3 text-sm text-slate-600">{TEMPLATES.find((t) => t.id === w.template)?.label ?? w.template}</span>
              <span className="truncate pr-3 font-mono text-xs text-slate-500" title={w.placement?.selector}>{w.placement?.selector || '—'}</span>
              <span className="flex justify-center">
                <button type="button" role="switch" aria-checked={w.active} onClick={() => toggleW(w)}
                  className={`relative h-6 w-11 rounded-full transition ${w.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${w.active ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </span>
              <span className="flex justify-end gap-3 text-slate-400">
                <button type="button" title="Editar" onClick={() => setEditW(w)} className="hover:text-[#0094EB]"><Pencil className="h-4 w-4" /></button>
                <button type="button" title="Excluir" onClick={() => removeW(w)} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className={`grid ${COLS_R} px-6 py-3 text-[11px] font-bold uppercase text-slate-500`}>
            <span>Cliente</span><span>Nota</span><span>Origem</span><span>Produto</span>
            <span className="text-center">Status</span><span className="text-right">Ações</span>
          </div>
          {loading && <div className="px-6 py-6 text-sm text-slate-400">Carregando...</div>}
          {!loading && shown.length === 0 && <div className="px-6 py-6 text-sm text-slate-400">Nenhuma avaliação.</div>}
          {shown.map((r) => (
            <div key={r.id} className={`grid ${COLS_R} items-center border-t border-slate-100 bg-slate-50/60 px-6 py-3.5`}>
              <span className="min-w-0 pr-3">
                <span className="block truncate text-sm font-bold text-slate-900">{r.author_name || 'Cliente'}</span>
                <span className="block truncate text-xs text-slate-500">{r.body || r.title || '—'}</span>
              </span>
              <span className="text-sm font-semibold text-amber-500">{r.rating} ★</span>
              <span className="text-sm text-slate-600">{SRC[r.source] ?? r.source}{r.media.length > 0 && ` · ${r.media.length} 📎`}</span>
              <span className="truncate pr-3 font-mono text-xs text-slate-500">{r.product_ref || '—'}</span>
              <span className="flex justify-center">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ST[r.status]?.c ?? ''}`}>{ST[r.status]?.l ?? r.status}</span>
              </span>
              <span className="flex justify-end gap-2.5 text-slate-400">
                {r.status !== 'approved' && (
                  <button type="button" title="Aprovar" onClick={() => void run(() => svc.setStatus(ctx.storeId, r.id, 'approved'))} className="hover:text-emerald-500"><Check className="h-4 w-4" /></button>
                )}
                {r.status !== 'rejected' && (
                  <button type="button" title="Rejeitar" onClick={() => void run(() => svc.setStatus(ctx.storeId, r.id, 'rejected'))} className="hover:text-amber-500"><X className="h-4 w-4" /></button>
                )}
                <button type="button" title="Editar" onClick={() => setEditR(r)} className="hover:text-[#0094EB]"><Pencil className="h-4 w-4" /></button>
                <button type="button" title="Excluir" onClick={() => removeR(r)} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </span>
            </div>
          ))}
        </div>
      )}

      {editW && (
        <ReviewWidgetModal ctx={ctx} initial={editW === 'new' ? null : editW} defaultName={`Reviews ${widgets.length + 1}`}
          onClose={() => setEditW(null)} onSaved={() => { setEditW(null); void load(); }} />
      )}
      {editR && (
        <ReviewModal ctx={ctx} initial={editR === 'new' ? null : editR}
          onClose={() => setEditR(null)} onSaved={() => { setEditR(null); void load(); }} />
      )}
    </div>
  );
}
