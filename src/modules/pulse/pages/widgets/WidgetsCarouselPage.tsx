import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, GalleryHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import CarouselModal from '../../components/widgets/CarouselModal';
import { infoCardsService } from '../../services/infoCardsService';
import { normalizeCarousel } from '../../lib/carouselDefaults';
import type { InfoCard } from '../../types/infoCards';
import type { WidgetsCtx } from '../../types/widgets';

const POS: Record<string, string> = { before: 'Acima', after: 'Abaixo', prepend: 'Dentro, início', append: 'Dentro, fim' };
const SHAPE: Record<string, string> = { square: 'Quadrado', rounded: 'Arredondado', circle: 'Circular' };
const COLS = 'grid-cols-[2fr_1fr_1fr_2fr_100px_110px]';

export default function WidgetsCarouselPage({ ctx }: { ctx: WidgetsCtx }) {
  const svc = useMemo(() => infoCardsService(ctx.supabase), [ctx.supabase]);
  const [cards, setCards] = useState<InfoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<InfoCard | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const all = await svc.list(ctx.storeId);
      setCards(all.filter((c) => c.kind === 'carousel'));
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
  async function duplicate(c: InfoCard) {
    try {
      setError('');
      await svc.save(ctx.storeId, {
        id: null, name: c.name + ' (cópia)', active: false, title: c.title, tiers: c.tiers, footer: c.footer ?? '',
        placement: c.placement, style_id: c.style_id, kind: 'carousel',
        icon_position: c.icon_position, icon_size: c.icon_size, icon_color: c.icon_color,
        icon_bg: c.icon_bg, icon_bg_color: c.icon_bg_color, design: normalizeCarousel(c.design),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao duplicar.'); }
  }
  async function remove(c: InfoCard) {
    if (!window.confirm(`Excluir o carrossel "${c.name}"?`)) return;
    try { await svc.remove(ctx.storeId, c.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GalleryHorizontal className="h-6 w-6 text-[#0094EB]" />
            <h1 className="text-2xl font-extrabold text-slate-900">Carrossel</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Carrossel de imagens com legenda e link: categorias, coleções, marcas e destaques.</p>
        </div>
        <button type="button" onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white">
          <Plus className="h-4 w-4" /> Criar novo
        </button>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className={`grid ${COLS} px-6 py-3 text-[11px] font-bold uppercase text-slate-500`}>
          <span>Nome</span><span>Imagens</span><span>Formato</span><span>Posição</span>
          <span className="text-center">Status</span><span className="text-right">Ações</span>
        </div>
        {loading && <div className="px-6 py-6 text-sm text-slate-400">Carregando...</div>}
        {!loading && cards.length === 0 && (
          <div className="px-6 py-6 text-sm text-slate-400">Nenhum carrossel criado. Clique em "Criar novo".</div>
        )}
        {cards.map((c) => (
          <div key={c.id} className={`grid ${COLS} items-center border-t border-slate-100 bg-slate-50/60 px-6 py-3.5`}>
            <span className="truncate pr-3 text-sm font-bold text-slate-900">{c.name}</span>
            <span className="text-sm text-slate-600">{c.tiers.length}</span>
            <span className="text-sm text-slate-600">{SHAPE[(c.design as { shape?: string })?.shape ?? 'square'] ?? '—'}</span>
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
              <button type="button" title="Duplicar" onClick={() => duplicate(c)} className="hover:text-[#0094EB]"><Copy className="h-4 w-4" /></button>
                  <button type="button" title="Excluir" onClick={() => remove(c)} className="hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <CarouselModal
          ctx={ctx}
          initial={editing === 'new' ? null : editing}
          defaultName={`Carrossel ${cards.length + 1}`}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}
