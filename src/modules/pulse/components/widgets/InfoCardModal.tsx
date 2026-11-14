import { useState } from 'react';
import { Monitor, Plus, Smartphone, Trash2, X } from 'lucide-react';
import RulerPreview from './RulerPreview';
import RulerCardsEditor from './RulerCardsEditor';
import WidgetPlacementPicker, { type Placement } from './WidgetPlacementPicker';
import { infoCardsService } from '../../services/infoCardsService';
import type { InfoCard } from '../../types/infoCards';
import { SAMPLE_CONTENT, mergeConfig, type Tier, type WidgetStyle, type WidgetsCtx } from '../../types/widgets';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0094EB]';
const labelCls = 'mb-1 block text-[10px] font-bold uppercase text-slate-400';
const EMPTY_PLACEMENT: Placement = { selector: '', position: 'before' };
const hasText = (t: Tier): boolean => !!(t.label.trim() || t.value.trim() || (t.lines ?? []).some((l) => l.text.trim()));

interface Props {
  ctx: WidgetsCtx;
  initial: InfoCard | null;
  defaultName: string;
  styles: WidgetStyle[];
  onClose: () => void;
  onSaved: () => void;
}

export default function InfoCardModal({ ctx, initial, defaultName, styles, onClose, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [active, setActive] = useState(initial?.active ?? false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [tiers, setTiers] = useState<Tier[]>(initial?.tiers ?? []);
  const [footer, setFooter] = useState(initial?.footer ?? '');
  const [placement, setPlacement] = useState<Placement>(initial?.placement ?? EMPTY_PLACEMENT);
  const [styleId, setStyleId] = useState<string | null>(initial?.style_id ?? null);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const style = styles.find((s) => s.id === styleId) ?? styles.find((s) => s.is_default);
  const cfg = mergeConfig(style?.config);
  const isCards = (['mobile', 'desktop'] as const).some((d) => cfg[d].layout === 'cards');
  const hasContent = title.trim() !== '' || tiers.length > 0;
  const preview = hasContent ? { title, tiers, footer } : SAMPLE_CONTENT;

  const setTier = (i: number, k: 'label' | 'value', v: string) =>
    setTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));

  async function save() {
    const clean = tiers.filter(hasText);
    if (!name.trim()) { setErr('Dê um nome ao card informativo.'); return; }
    if (active && !placement.selector.trim()) { setErr('Selecione o elemento da loja antes de ativar.'); return; }
    if (active && clean.length === 0) { setErr('Adicione ao menos um card/faixa antes de ativar.'); return; }
    setSaving(true); setErr('');
    try {
      await infoCardsService(ctx.supabase).save(ctx.storeId, {
        id: initial?.id ?? null, name: name.trim(), active, title, tiers: clean, footer, placement, style_id: styleId,
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
          <h2 className="text-lg font-extrabold text-slate-900">{initial ? 'Editar card informativo' : 'Novo card informativo'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-extrabold uppercase text-slate-800">1. Conteúdo</h3>
              <label className="block"><span className={labelCls}>Nome (uso interno)</span>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="mt-4 block"><span className={labelCls}>Título</span>
                <input className={inputCls} value={title} placeholder={SAMPLE_CONTENT.title} onChange={(e) => setTitle(e.target.value)} /></label>

              <div className="mt-4">
                <span className={labelCls}>{isCards ? 'Cards (quantidade livre)' : 'Faixas (até 6)'}</span>
                {isCards ? <RulerCardsEditor tiers={tiers} onChange={setTiers} /> : (
                  <>
                    <div className="space-y-2">
                      {tiers.map((t, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input className={inputCls} value={t.label} placeholder="2 peças" onChange={(e) => setTier(i, 'label', e.target.value)} />
                          <input className={inputCls} value={t.value} placeholder="5% OFF" onChange={(e) => setTier(i, 'value', e.target.value)} />
                          <button type="button" onClick={() => setTiers(tiers.filter((_, x) => x !== i))}
                            className="rounded-xl border border-slate-200 px-3 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                    {tiers.length < 6 && (
                      <button type="button" onClick={() => setTiers([...tiers, { label: '', value: '' }])}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600">
                        <Plus className="h-3.5 w-3.5" /> Adicionar faixa
                      </button>
                    )}
                  </>
                )}
              </div>

              <label className="mt-4 block"><span className={labelCls}>Rodapé</span>
                <input className={inputCls} value={footer} placeholder={SAMPLE_CONTENT.footer} onChange={(e) => setFooter(e.target.value)} /></label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-extrabold uppercase text-slate-800">2. Posição na loja</h3>
              <WidgetPlacementPicker supabase={ctx.supabase} storeId={ctx.storeId} storeUrl={ctx.storeUrl}
                value={placement} onChange={setPlacement} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-extrabold uppercase text-slate-800">3. Estilo</h3>
              <label className="block"><span className={labelCls}>Estilo do card</span>
                <select className={inputCls} value={styleId ?? ''} onChange={(e) => setStyleId(e.target.value || null)}>
                  <option value="">Padrão da loja{styles.find((s) => s.is_default) ? ` (${styles.find((s) => s.is_default)?.name})` : ''}</option>
                  {styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></label>
              <p className="mt-2 text-xs text-slate-400">
                {styles.length === 0 ? 'Nenhum estilo criado: será usado o visual padrão. ' : ''}
                Crie e edite estilos na aba <b>Aparência</b>.
              </p>
            </section>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
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
              <div className={`mx-auto rounded-xl bg-slate-50 p-3 ${device === 'mobile' ? 'max-w-[320px]' : 'w-full'}`}>
                <div className="mb-2 h-20 rounded-lg bg-slate-200" />
                <RulerPreview a={cfg[device]} content={preview} />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
              </div>
              {!hasContent && <p className="mt-3 text-center text-xs text-slate-400">Exemplo ilustrativo. Preencha o conteúdo para ver o seu.</p>}
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