import { useMemo, useState } from 'react';
import { Loader2, Palette, X } from 'lucide-react';
import WidgetPlacementPicker, { type Placement, type PageRule } from './WidgetPlacementPicker';
import ReviewsPreview from './ReviewsPreview';
import { reviewsService } from '../../services/reviewsService';
import { TEMPLATES, templateDesign, type ReviewDesign, type ReviewScope, type ReviewSource, type ReviewWidget } from '../../types/reviews';
import { CARD_FONTS, type WidgetsCtx } from '../../types/widgets';

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[color:var(--sll-b-brand)]';
const lbl = 'mb-1 block text-[10px] font-bold uppercase text-slate-400';

const SRC: { v: ReviewSource; label: string }[] = [
  { v: 'manual', label: 'Criadas por mim' }, { v: 'store', label: 'Coletadas na loja' }, { v: 'google', label: 'Google' },
];
const COLORS: [keyof ReviewDesign, string][] = [
  ['accent', 'Destaque'], ['star_color', 'Estrelas'], ['bg', 'Fundo'], ['text', 'Texto'],
  ['title_color', 'Títulos'], ['card_bg', 'Fundo dos cards'], ['border', 'Bordas'],
];
const TOGGLES: [keyof ReviewDesign, string][] = [
  ['show_title', 'Título'], ['show_summary', 'Resumo da nota'], ['show_stars', 'Estrelas'], ['show_avatar', 'Avatar'],
  ['show_date', 'Data'], ['show_source', 'Origem (Google)'], ['show_verified', 'Compra verificada'], ['show_media', 'Fotos e vídeos'],
];
const GRID_TPL = ['cards_clean', 'text_only', 'photo_wall'];
const CAROUSEL_TPL = ['cards_photo', 'cards_clean', 'text_only'];
const PAGE_RULES: [PageRule, string][] = [
  ['auto', 'Automático (página do próprio produto)'], ['home', 'Somente na Home'], ['all_pages', 'Todas as páginas'],
  ['url_contains', 'URL contém'], ['url_not_contains', 'URL não contém'], ['url_not_equals', 'URL diferente'],
];
const RULES_WITH_VALUE: PageRule[] = ['url_contains', 'url_not_contains', 'url_not_equals'];

interface Props { ctx: WidgetsCtx; initial: ReviewWidget | null; defaultName: string; onClose: () => void; onSaved: () => void; }

export default function ReviewWidgetModal({ ctx, initial, defaultName, onClose, onSaved }: Props) {
  const svc = useMemo(() => reviewsService(ctx.supabase), [ctx.supabase]);
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [active, setActive] = useState(initial?.active ?? false);
  const [scope, setScope] = useState<ReviewScope>(initial?.scope ?? 'product');
  const [template, setTemplate] = useState(initial?.template ?? 'cards_photo');
  const [minRating, setMinRating] = useState(initial?.min_rating ?? 1);
  const [maxItems, setMaxItems] = useState(initial?.max_items ?? 12);
  const [sources, setSources] = useState<ReviewSource[]>(initial?.sources ?? ['manual', 'store', 'google']);
  const [placement, setPlacement] = useState<Placement>(initial?.placement ?? { selector: '', position: 'after' });
  const [design, setDesign] = useState<ReviewDesign>(() => ({ ...templateDesign(initial?.template ?? 'cards_photo'), ...(initial?.design ?? {}) }));
  const [showApp, setShowApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pickUrl, setPickUrl] = useState('');

  const setD = <K extends keyof ReviewDesign>(k: K, v: ReviewDesign[K]) => setDesign((d) => ({ ...d, [k]: v }));
  const pickTemplate = (id: string) => { setTemplate(id); setDesign(templateDesign(id)); };
  const toggleSrc = (s: ReviewSource) => setSources((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  async function save() {
    if (!sources.length) { setError('Escolha ao menos uma origem de avaliações.'); return; }
    if (RULES_WITH_VALUE.includes(placement.rule ?? 'auto') && !(placement.rule_value ?? '').trim()) { setError('Informe o texto da URL da regra.'); return; }
    if (active && scope === 'storefront' && !placement.selector.trim()) { setError('Defina o elemento da loja antes de ativar.'); return; }
    setBusy(true); setError('');
    try {
      await svc.widgetSave(ctx.storeId, {
        id: initial?.id ?? null, name: name.trim() || defaultName, active, scope, template,
        min_rating: minRating, sources, max_items: maxItems, placement, design,
      });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar.'); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-extrabold text-slate-900">{initial ? 'Editar widget de reviews' : 'Novo widget de reviews'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[440px_minmax(0,1fr)]">
          <div className="space-y-5 overflow-y-auto p-6">
            <label className="block"><span className={lbl}>Nome</span>
              <input className={inp} value={name} onChange={(e) => setName(e.target.value)} /></label>

            <div>
              <span className={lbl}>Onde aparece</span>
              <div className="grid grid-cols-2 gap-2">
                {([['product', 'Página de produto'], ['storefront', 'Vitrine (home e outras)']] as [ReviewScope, string][]).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setScope(v)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${scope === v ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]' : 'border-slate-200 text-slate-600'}`}>{l}</button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {scope === 'product' ? 'Mostra só as avaliações do produto da página.' : 'Mostra as melhores avaliações da loja toda.'}
              </p>
            </div>

            <div>
              <span className={lbl}>Modelo</span>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => pickTemplate(t.id)}
                    className={`rounded-xl border p-3 text-left ${template === t.id ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)]' : 'border-slate-200'}`}>
                    <div className="text-sm font-bold text-slate-900">{t.label}</div>
                    <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{t.desc}</div>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">Trocar o modelo restaura o visual padrão dele.</p>
            </div>

            <button type="button" onClick={() => setShowApp((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--sll-b-brand)] px-4 py-2.5 text-sm font-bold text-[color:var(--sll-b-brand)]">
              <Palette className="h-4 w-4" /> Aparência {showApp ? '▲' : '▼'}
            </button>
            {showApp && (
              <div className="space-y-4 rounded-xl bg-slate-50 p-4">
                <label className="block"><span className={lbl}>Título</span>
                  <input className={inp} value={design.title} onChange={(e) => setD('title', e.target.value)} /></label>
                <div className="grid grid-cols-2 gap-3">
                  {COLORS.map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="color" value={String(design[k])} onChange={(e) => setD(k, e.target.value as never)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-200" /> {l}
                    </label>
                  ))}
                </div>
                <label className="block"><span className={lbl}>Fonte</span>
                  <select className={inp} value={design.font} onChange={(e) => setD('font', e.target.value)}>
                    {CARD_FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></label>
                <div className="grid grid-cols-2 gap-3">
                  <label><span className={lbl}>Arredondamento: {design.radius}px</span>
                    <input type="range" min={0} max={32} value={design.radius} onChange={(e) => setD('radius', Number(e.target.value))} className="w-full" /></label>
                  <label><span className={lbl}>Margem vertical: {design.margin_y}px</span>
                    <input type="range" min={0} max={80} value={design.margin_y} onChange={(e) => setD('margin_y', Number(e.target.value))} className="w-full" /></label>
                  {GRID_TPL.includes(template) && (
                    <label><span className={lbl}>Colunas</span>
                      <select className={inp} value={design.columns} onChange={(e) => setD('columns', Number(e.target.value))}>
                        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select></label>
                  )}
                </div>
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      <span className={lbl}>Largura na loja</span>
                      <div className="grid grid-cols-3 gap-2">
                        {([['auto', 'Automática'], ['full', 'Tela toda'], ['custom', 'Personalizada']] as [ReviewDesign['width_mode'], string][]).map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setD('width_mode', v)}
                            className={'rounded-lg border px-2 py-2 text-xs font-semibold ' + (design.width_mode === v ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]' : 'border-slate-200 text-slate-600')}>{l}</button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        {design.width_mode === 'auto' && 'Segue a largura do bloco da loja onde o review é inserido (alinhado ao tema).'}
                        {design.width_mode === 'full' && 'Ocupa a largura inteira da tela.'}
                        {design.width_mode === 'custom' && 'Você define a largura máxima e o alinhamento.'}
                      </p>
                      {design.width_mode === 'custom' && (
                        <div className="grid grid-cols-2 gap-3">
                          <label><span className={lbl}>Largura máx. (px)</span>
                            <input type="number" min={200} className={inp} value={design.max_width || ''} placeholder="1100"
                              onChange={(e) => setD('max_width', Number(e.target.value) || 0)} /></label>
                          <label><span className={lbl}>Alinhamento</span>
                            <select className={inp} value={design.align} onChange={(e) => setD('align', e.target.value as ReviewDesign['align'])}>
                              <option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option>
                            </select></label>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <label><span className={lbl}>Espaço interno: {design.padding}px</span>
                          <input type="range" min={0} max={48} value={design.padding} onChange={(e) => setD('padding', Number(e.target.value))} className="w-full" /></label>
                        <label><span className={lbl}>Margem lateral: {design.margin_x}px</span>
                          <input type="range" min={0} max={80} value={design.margin_x} onChange={(e) => setD('margin_x', Number(e.target.value))} className="w-full" /></label>
                      </div>
                    </div>
                    {CAROUSEL_TPL.includes(template) && (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={design.carousel} onChange={(e) => setD('carousel', e.target.checked)} /> Exibir como carrossel
                        </label>
                        {design.carousel && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              {([['arrows', 'Setas'], ['dots', 'Pontos'], ['drag', 'Arrastar (mouse e dedo)'], ['loop', 'Loop (volta ao início)'], ['autoplay', 'Passar automático']] as [keyof ReviewDesign, string][]).map(([k, l]) => (
                                <label key={k} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                  <input type="checkbox" checked={Boolean(design[k])} onChange={(e) => setD(k, e.target.checked as never)} /> {l}
                                </label>
                              ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {design.autoplay && (
                                <label><span className={lbl}>Intervalo (s)</span>
                                  <input type="number" min={1} max={30} className={inp} value={design.interval} onChange={(e) => setD('interval', Math.max(1, Number(e.target.value) || 5))} /></label>
                              )}
                              <label><span className={lbl}>Itens (desktop)</span>
                                <input type="number" min={1} max={6} step={0.5} className={inp} value={design.per_view_desktop} onChange={(e) => setD('per_view_desktop', Math.max(1, Number(e.target.value) || 1))} /></label>
                              <label><span className={lbl}>Itens (mobile)</span>
                                <input type="number" min={1} max={3} step={0.1} className={inp} value={design.per_view_mobile} onChange={(e) => setD('per_view_mobile', Math.max(1, Number(e.target.value) || 1))} /></label>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {scope === 'product' && (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={design.hide_native} onChange={(e) => setD('hide_native', e.target.checked)} /> Ocultar avaliações nativas da loja
                        </label>
                        <p className="text-xs text-slate-500">
                          Esconde o bloco de avaliações da plataforma só quando o review do SLL aparecer na página. {design.allow_submit ? 'Com o envio do SLL ligado, os clientes avaliam pelo formulário do SLL.' : 'Atenção: o botão "Avaliar produto" do bloco nativo também some.'}
                        </p>
                        {design.hide_native && (
                          <label className="block"><span className={lbl}>Seletor do bloco nativo</span>
                            <input className={inp + ' font-mono'} value={design.native_selector} placeholder="section.product-reviews (padrão Yampi)"
                              onChange={(e) => setD('native_selector', e.target.value)} /></label>
                        )}
                      </div>
                    )}
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input type="checkbox" checked={Boolean(design.allow_submit)} onChange={(e) => setD('allow_submit', e.target.checked)} /> Permitir envio de avaliações pelos clientes
                      </label>
                      <p className="text-xs text-slate-500">
                        Mostra um botão que abre o formulário (nota, nome, e-mail, título e texto). As avaliações chegam como Pendente e só aparecem na loja depois de aprovadas. Sem avaliações aprovadas, o botão aparece mesmo assim.
                      </p>
                      {design.allow_submit && (
                        <div className="space-y-2"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <input type="checkbox" checked={design.allow_media !== false} onChange={(e) => setD('allow_media', e.target.checked)} /> Permitir foto e vídeo no formulário
                        </label>
                        <label className="block"><span className={lbl}>Texto do botão</span>
                          <input className={inp} maxLength={40} value={design.submit_label ?? ''} placeholder="Escrever avaliação"
                            onChange={(e) => setD('submit_label', e.target.value)} /></label></div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {TOGGLES.map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" checked={Boolean(design[k])} onChange={(e) => setD(k, e.target.checked as never)} /> {l}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className={lbl}>Quais avaliações mostrar</span>
              <div className="flex flex-wrap gap-3">
                {SRC.map((s) => (
                  <label key={s.v} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={sources.includes(s.v)} onChange={() => toggleSrc(s.v)} /> {s.label}
                  </label>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label><span className={lbl}>Nota mínima</span>
                  <select className={inp} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}★ ou mais</option>)}
                  </select></label>
                <label><span className={lbl}>Máximo de itens</span>
                  <input type="number" min={1} max={50} className={inp} value={maxItems}
                    onChange={(e) => setMaxItems(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} /></label>
              </div>
            </div>

            <div>
              <span className={lbl}>Posição na loja</span>
                  {scope === 'product' && <p className="mb-2 text-xs text-slate-500">Deixe o seletor vazio para exibir automaticamente no fim da descrição do produto.</p>}
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <label><span className={lbl}>Regra da página</span>
                      <select className={inp} value={placement.rule ?? 'auto'}
                        onChange={(e) => setPlacement({ ...placement, rule: e.target.value as PageRule })}>
                        {PAGE_RULES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select></label>
                    {RULES_WITH_VALUE.includes(placement.rule ?? 'auto') && (
                      <label><span className={lbl}>Texto da URL</span>
                        <input className={inp} value={placement.rule_value ?? ''} placeholder="confort"
                          onChange={(e) => setPlacement({ ...placement, rule_value: e.target.value })} /></label>
                    )}
                  </div>
              {scope === 'product' && (
                <label className="mb-3 block">
                  <span className={lbl}>URL de um produto da loja (para escolher o elemento)</span>
                  <input className={inp} value={pickUrl} placeholder="https://sualoja.com.br/produto-x/p"
                    onChange={(e) => setPickUrl(e.target.value)} />
                </label>
              )}
              <WidgetPlacementPicker key={pickUrl.trim()} supabase={ctx.supabase} storeId={ctx.storeId}
                storeUrl={/^https?:\/\//.test(pickUrl.trim()) ? pickUrl.trim() : ctx.storeUrl}
                value={placement} onChange={setPlacement} />
              <label className="mt-3 block">
                <span className={lbl}>Seletor CSS (manual, opcional)</span>
                <input className={inp + ' font-mono'} value={placement.selector} placeholder={scope === 'product' ? 'Vazio = automático (fim da descrição)' : '#banner-principal'}
                  onChange={(e) => setPlacement({ ...placement, selector: e.target.value })} />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo na loja
            </label>
          </div>

          <div className="overflow-y-auto bg-slate-100 p-6">
            <div className="mb-2 text-[10px] font-bold uppercase text-slate-400">Preview (exemplos)</div>
            <div className="rounded-xl bg-white p-3">
              <ReviewsPreview template={template} design={design} />
            </div>
          </div>
        </div>
        {error && <div className="mx-6 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" disabled={busy} onClick={save}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
