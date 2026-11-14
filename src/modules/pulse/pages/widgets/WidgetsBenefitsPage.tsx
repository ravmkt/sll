import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import BenefitsModal from '../../components/widgets/BenefitsModal';
import { infoCardsService } from '../../services/infoCardsService';
import type { InfoCard } from '../../types/infoCards';
import type { WidgetsCtx } from '../../types/widgets';

const POS: Record<string, string> = { before: 'Acima', after: 'Abaixo', prepend: 'Dentro, início', append: 'Dentro, fim' };
const ICON_POS: Record<string, string> = { top: 'Topo', left: 'Esquerda', right: 'Direita' };
const COLS = 'grid-cols-[2fr_1fr_1fr_2fr_100px_80px]';

export default function WidgetsBenefitsPage({ ctx }: { ctx: WidgetsCtx }) {
  const svc = useMemo(() => infoCardsService(ctx.supabase), [ctx.supabase]);
  const [cards, setCards] = useState<InfoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<InfoCard | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const all = await svc.list(ctx.storeId);
      setCards(all.filter((c) => c.kind === 'benefits'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally { setLoading(false); }
  }, [svc, ctx.storeId]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(c: InfoCard) {
    if (!c.active && !c.placement?.selector?.trim()) {
      setError('Defina o elemento da loja antes de ativar (clique em editar).'); return;
    }
    try { setError(''); await svc.setActive(ctx.storeId, c.id, !c.active); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro.'); }
  }
  async function remove(c: InfoCard) {
    if (!window.confirm(`Excluir a barra de benefícios "${c.name}"?`)) return;
    try { await svc.remove(ctx.storeId, c.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-6 w-6 text-[#0094EB]" />
            <h1 className="text-2xl font-extrabold text-slate-900">Barra de benefícios</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Frete grátis, parcelamento, troca e outros diferenciais exibidos com ícones na loja.</p>
        </div>
        <button type="button" onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white">
          <Plus className="h-4 w-4" /> Criar nova
        </button>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className={`grid ${COLS} px-6 py-3 text-[11px] font-bold uppercase text-slate-500`}>
          <span>Nome</span><span>Benefícios</span><span>Ícone</span><span>Posição</span>
          <span className="text-center">Status</span><span className="text-right">Ações</span>
        </div>
        {loading && <div className="px-6 py-6 text-sm text-slate-400">Carregando...</div>}
        {!loading && cards.length === 0 && (
          <div className="px-6 py-6 text-sm text-slate-400">Nenhuma barra criada. Clique em "Criar nova".</div>
        )}
        {cards.map((c) => (
          <div key={c.id} className={`grid ${COLS} items-center border-t border-slate-100 bg-slate-50/60 px-6 py-3.5`}>
            <span className="truncate pr-3 text-sm font-bold text-slate-900">{c.name}</span>
            <span className="text-sm text-slate-600">{c.tiers.length}</span>
            <span className="text-sm text-slate-600">{ICON_POS[c.icon_position] ?? '—'}</span>
            <span className="truncate pr-3 font-mono text-xs text-slate-500" title={c.placement?.selector}>
              {c.placement?.selector ? `${POS[c.placement.position] ?? ''} · ${c.placement.selector}` : '—'}
            </span>
            <span className="flex justify-center">
              <button type="button" role="switch" aria-checked={c.active} onClick={() => toggle(c)}
                className={`relative h-6 w-11 rounded-full transition ${c.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${c.active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </span>
            <span className="flex justify-end gap-3 text-slate-400">
              <button type="button" title="Editar" onClick={() => setEditing(c)} className="hover:text-[#0094EB]"><Pencil className="h-4 w-4" /></button>
              <button type="button" title="Excluir" onClick={() => remove(c)} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <BenefitsModal
          ctx={ctx}
          initial={editing === 'new' ? null : editing}
          defaultName={`Barra de benefícios ${cards.length + 1}`}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}
