import { useState } from 'react';
import { Monitor, Plus, Smartphone, Trash2, X } from 'lucide-react';
import WidgetPlacementPicker, { type Placement } from './WidgetPlacementPicker';
import BenefitsBarPreview from './BenefitsBarPreview';
import IconPicker from './IconPicker';
import { infoCardsService } from '../../services/infoCardsService';
import { BENEFIT_TEMPLATES, DEFAULT_DESIGN, DEFAULT_ICON, ICON_MAP, type BenefitTemplate } from '../../lib/benefitIcons';
import type { BenefitItem, BenefitsDesign, IconBg, IconPosition, IconSettings, InfoCard } from '../../types/infoCards';
import type { WidgetsCtx } from '../../types/widgets';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0094EB]';
const labelCls = 'mb-1 block text-[10px] font-bold uppercase text-slate-400';
const EMPTY_PLACEMENT: Placement = { selector: '', position: 'before' };
const MAX_ITEMS = 8;
const POSITIONS: { id: IconPosition; label: string }[] = [
  { id: 'top', label: 'Topo' }, { id: 'left', label: 'Esquerda' }, { id: 'right', label: 'Direita' },
];
const validLink = (l?: string) => !l || /^(https?:\/\/|\/)/i.test(l.trim());
const sec = 'rounded-2xl border border-slate-200 bg-white p-5';
const h3 = 'mb-4 text-sm font-extrabold uppercase text-slate-800';

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block"><span className={labelCls}>{label}</span>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></label>
  );
}

interface Props { ctx: WidgetsCtx; initial: InfoCard | null; defaultName: string; onClose: () => void; onSaved: () => void }

export default function BenefitsModal({ ctx, initial, defaultName, onClose, onSaved }: Props) {
  const base = BENEFIT_TEMPLATES[0];
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [active, setActive] = useState(initial?.active ?? false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [items, setItems] = useState<BenefitItem[]>(initial ? (initial.tiers as BenefitItem[]) : base.items);
  const [placement, setPlacement] = useState<Placement>(initial?.placement ?? EMPTY_PLACEMENT);
  const [ic, setIc] = useState<IconSettings>(initial ? {
    position: initial.icon_position ?? DEFAULT_ICON.position, size: initial.icon_size ?? DEFAULT_ICON.size,
    color: initial.icon_color ?? DEFAULT_ICON.color, bg: initial.icon_bg ?? DEFAULT_ICON.bg,
    bg_color: initial.icon_bg_color ?? DEFAULT_ICON.bg_color,
  } : base.icon);
  const [ds, setDs] = useState<BenefitsDesign>(initial ? { ...DEFAULT_DESIGN, ...initial.design } : base.design);
  const [tplId, setTplId] = useState<string>(initial ? '' : base.id);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const setIcon = (p: Partial<IconSettings>) => { setIc((s) => ({ ...s, ...p })); setTplId(''); };
  const setDesign = (p: Partial<BenefitsDesign>) => { setDs((s) => ({ ...s, ...p })); setTplId(''); };
  const setItem = (i: number, p: Partial<BenefitItem>) => setItems((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const filled = items.filter((i) => i.label.trim() || i.value.trim());

  function applyTemplate(t: BenefitTemplate) {
    setIc(t.icon); setDs(t.design); setTplId(t.id);
    if (filled.length === 0) setItems(t.items);
  }

  async function save() {
    if (!name.trim()) { setErr('Dê um nome à barra de benefícios.'); return; }
    if (filled.some((i) => !validLink(i.link))) { setErr('Links devem começar com http://, https:// ou /.'); return; }
    if (active && !placement.selector.trim()) { setErr('Selecione o elemento da loja antes de ativar.'); return; }
    if (active && filled.length === 0) { setErr('Adicione ao menos um benefício antes de ativar.'); return; }
    setSaving(true); setErr('');
    try {
      await infoCardsService(ctx.supabase).save(ctx.storeId, {
        id: initial?.id ?? null, name: name.trim(), active, title, tiers: filled, footer: '', placement, style_id: null,
        kind: 'benefits', icon_position: ic.position, icon_size: ic.size, icon_color: ic.color,
        icon_bg: ic.bg, icon_bg_color: ic.bg_color, design: ds,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div className="my-4 w-full max-w-[1200px] rounded-2xl bg-slate-50 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-extrabold text-slate-900">{initial ? 'Editar barra de benefícios' : 'Nova barra de benefícios'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-5">
            <section className={sec}>
              <h3 className={h3}>1. Template</h3>
              <div className="grid grid-cols-3 gap-2">
                {BENEFIT_TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                    className={`rounded-xl border p-3 text-left ${tplId === t.id ? 'border-[#0094EB] bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="text-sm font-bold text-slate-800">{t.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{t.description}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className={sec}>
              <h3 className={h3}>2. Benefícios</h3>
              <label className="block"><span className={labelCls}>Nome (uso interno)</span>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="mt-4 block"><span className={labelCls}>Título acima da barra (opcional)</span>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
              <div className="mt-4 space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <IconPicker item={it} onChange={(p) => setItem(i, p)} />
                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                        <input className={inputCls} value={it.label} placeholder="Título (ex.: Frete grátis)" onChange={(e) => setItem(i, { label: e.target.value })} />
                        <input className={inputCls} value={it.value} placeholder="Subtítulo (ex.: acima de R$ 199)" onChange={(e) => setItem(i, { value: e.target.value })} />
                      </div>
                      <button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <input className={`${inputCls} mt-2`} value={it.link ?? ''} placeholder="Link ao clicar (opcional): https://..." onChange={(e) => setItem(i, { link: e.target.value })} />
                  </div>
                ))}
              </div>
              {items.length < MAX_ITEMS && (
                <button type="button"
                  onClick={() => setItems([...items, { label: '', value: '', icon: 'badge-check', icon_svg: ICON_MAP['badge-check'].svg, link: '' }])}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600">
                  <Plus className="h-3.5 w-3.5" /> Adicionar benefício
                </button>
              )}
            </section>

            <section className={sec}>
              <h3 className={h3}>3. Ícone</h3>
              <span className={labelCls}>Posição do ícone</span>
              <div className="flex gap-2">
                {POSITIONS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setIcon({ position: p.id })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${ic.position === p.id ? 'border-[#0094EB] bg-sky-50 text-[#0094EB]' : 'border-slate-200 text-slate-600'}`}>{p.label}</button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block"><span className={labelCls}>Tamanho: {ic.size}px</span>
                  <input type="range" min={16} max={56} value={ic.size} onChange={(e) => setIcon({ size: Number(e.target.value) })} className="w-full" /></label>
                <label className="block"><span className={labelCls}>Fundo do ícone</span>
                  <select className={inputCls} value={ic.bg} onChange={(e) => setIcon({ bg: e.target.value as IconBg })}>
                    <option value="none">Sem fundo</option><option value="circle">Círculo</option><option value="square">Quadrado</option>
                  </select></label>
                <Color label="Cor do ícone" value={ic.color} onChange={(v) => setIcon({ color: v })} />
                <Color label="Cor do fundo" value={ic.bg_color} onChange={(v) => setIcon({ bg_color: v })} />
              </div>
            </section>

            <section className={sec}>
              <h3 className={h3}>4. Visual</h3>
              <div className="grid grid-cols-2 gap-3">
                <Color label="Fundo" value={ds.bg} onChange={(v) => setDesign({ bg: v })} />
                <Color label="Borda" value={ds.border} onChange={(v) => setDesign({ border: v })} />
                <Color label="Texto" value={ds.text} onChange={(v) => setDesign({ text: v })} />
                <Color label="Subtítulo" value={ds.sub} onChange={(v) => setDesign({ sub: v })} />
                <label className="block"><span className={labelCls}>Arredondamento: {ds.radius}px</span>
                  <input type="range" min={0} max={24} value={ds.radius} onChange={(e) => setDesign({ radius: Number(e.target.value) })} className="w-full" /></label>
                <label className="block"><span className={labelCls}>No mobile</span>
                  <select className={inputCls} value={ds.mobile} onChange={(e) => setDesign({ mobile: e.target.value as 'carousel' | 'stack' })}>
                    <option value="carousel">Carrossel (arrastar)</option><option value="stack">Um abaixo do outro</option>
                  </select></label>
              </div>
              <div className="mt-3 flex flex-wrap gap-5 text-sm text-slate-700">
                <label className="flex items-center gap-2"><input type="checkbox" checked={ds.divider} onChange={(e) => setDesign({ divider: e.target.checked })} /> Divisores</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={ds.item_card} onChange={(e) => setDesign({ item_card: e.target.checked })} /> Um card por benefício</label>
              </div>
            </section>

            <section className={sec}>
              <h3 className={h3}>5. Posição na loja</h3>
              <WidgetPlacementPicker supabase={ctx.supabase} storeId={ctx.storeId} storeUrl={ctx.storeUrl} value={placement} onChange={setPlacement} />
            </section>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className={sec}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase text-slate-800">Preview</h3>
                <div className="flex rounded-lg border border-slate-200 p-0.5">
                  {(['mobile', 'desktop'] as const).map((d) => (
                    <button key={d} type="button" onClick={() => setDevice(d)}
                      className={`rounded-md p-1.5 ${device === d ? 'bg-[#0094EB] text-white' : 'text-slate-500'}`}>
                      {d === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`mx-auto rounded-xl bg-slate-50 p-3 ${device === 'mobile' ? 'max-w-[340px]' : 'w-full'}`}>
                <div className="mb-2 h-16 rounded-lg bg-slate-200" />
                <BenefitsBarPreview title={title} items={filled} ic={ic} ds={ds} device={device} />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <button type="button" role="switch" aria-checked={active} onClick={() => setActive(!active)}
              className={`relative h-6 w-11 rounded-full transition ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${active ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            {active ? 'Ativo na loja' : 'Rascunho / pausado'}
          </div>
          <div className="flex items-center gap-3">
            {err && <span className="text-sm font-semibold text-red-600">{err}</span>}
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" onClick={save} disabled={saving}
              className="rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
