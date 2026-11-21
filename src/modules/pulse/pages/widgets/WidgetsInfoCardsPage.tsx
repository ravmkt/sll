import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, PanelTop, Plus, Trash2 } from 'lucide-react';
import InfoCardModal from '../../components/widgets/InfoCardModal';
import { infoCardsService } from '../../services/infoCardsService';
import { widgetsService } from '../../services/widgetsService';
import type { InfoCard } from '../../types/infoCards';
import { mergeConfig, type WidgetStyle, type WidgetsCtx } from '../../types/widgets';

const POS: Record<string, string> = { before: 'Acima', after: 'Abaixo', prepend: 'Dentro, início', append: 'Dentro, fim' };
const COLS = 'grid-cols-[2fr_1.2fr_1.5fr_1.8fr_100px_80px]';

export default function WidgetsInfoCardsPage({ ctx }: { ctx: WidgetsCtx }) {
  const svc = useMemo(() => infoCardsService(ctx.supabase), [ctx.supabase]);
  const wsvc = useMemo(() => widgetsService(ctx.supabase), [ctx.supabase]);
  const [cards, setCards] = useState<InfoCard[]>([]);
  const [styles, setStyles] = useState<WidgetStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<InfoCard | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [c, s] = await Promise.all([svc.list(ctx.storeId), wsvc.listStyles(ctx.storeId)]);
      setCards(c.filter((x) => x.kind === 'info')); setStyles(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally { setLoading(false); }
  }, [svc, wsvc, ctx.storeId]);

  useEffect(() => { void load(); }, [load]);

  const effStyle = (c: InfoCard) => styles.find((s) => s.id === c.style_id) ?? styles.find((s) => s.is_default);
  const layoutOf = (c: InfoCard) => {
    const st = effStyle(c);
    return st && mergeConfig(st.config).desktop.layout === 'cards' ? 'Cards' : 'Bolinhas com linha';
  };

  async function toggle(c: InfoCard) {
    if (!c.active && !c.placement?.selector?.trim()) {
      setError('Defina o elemento da loja antes de ativar (clique em editar).'); return;
    }
    try { setError(''); await svc.setActive(ctx.storeId, c.id, !c.active); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro.'); }
  }
  async function remove(c: InfoCard) {
    if (!window.confirm(`Excluir o card informativo "${c.name}"?`)) return;
    try { await svc.remove(ctx.storeId, c.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PanelTop className="h-6 w-6 text-[color:var(--sll-b-brand)]" />
            <h1 className="text-2xl font-extrabold text-slate-900">Card informativo</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Cards informativos exibidos na loja. O desconto real é configurado na plataforma da loja.</p>
        </div>
        <button type="button" onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-5 py-2.5 text-sm font-bold text-white">
          <Plus className="h-4 w-4" /> Criar novo
        </button>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className={`grid ${COLS} px-6 py-3 text-[11px] font-bold uppercase text-slate-500`}>
          <span>Nome</span><span>Layout</span><span>Estilo</span><span>Posição</span>
          <span className="text-center">Status</span><span className="text-right">Ações</span>
        </div>
        {loading && <div className="px-6 py-6 text-sm text-slate-400">Carregando...</div>}
        {!loading && cards.length === 0 && (
          <div className="px-6 py-6 text-sm text-slate-400">Nenhum card informativo criado. Clique em "Criar novo".</div>
        )}
        {cards.map((c) => (
          <div key={c.id} className={`grid ${COLS} items-center border-t border-slate-100 bg-slate-50/60 px-6 py-3.5`}>
            <span className="truncate pr-3 text-sm font-bold text-slate-900">{c.name}</span>
            <span className="text-sm text-slate-600">{layoutOf(c)}</span>
            <span className="truncate pr-3 text-sm text-slate-600">{effStyle(c)?.name ?? 'Visual padrão'}{!c.style_id && effStyle(c) ? ' (padrão)' : ''}</span>
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
              <button type="button" title="Editar" onClick={() => setEditing(c)} className="hover:text-[color:var(--sll-b-brand)]"><Pencil className="h-4 w-4" /></button>
              <button type="button" title="Excluir" onClick={() => remove(c)} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <InfoCardModal
          ctx={ctx}
          initial={editing === 'new' ? null : editing}
          defaultName={`Card informativo ${cards.length + 1}`}
          styles={styles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}
