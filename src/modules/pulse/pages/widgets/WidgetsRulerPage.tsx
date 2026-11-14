import { useEffect, useMemo, useState } from 'react';
import { Monitor, Plus, Ruler, Save, Smartphone, Trash2 } from 'lucide-react';
import RulerPreview from '../../components/widgets/RulerPreview';
import WidgetPlacementPicker, { type Placement } from '../../components/widgets/WidgetPlacementPicker';
import { widgetsService } from '../../services/widgets/widgetsService';
import { SAMPLE_CONTENT, mergeConfig, type RulerSettings, type Tier, type WidgetStyle, type WidgetsCtx } from '../../types/widgets';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0094EB]';
const labelCls = 'mb-1 block text-[10px] font-bold uppercase text-slate-400';
type Form = Omit<RulerSettings, 'store_id'>;
const EMPTY: Form = { active: false, title: '', tiers: [], footer: '', placement: { selector: '', position: 'before' }, style_id: null };

export default function WidgetsRulerPage({ ctx }: { ctx: WidgetsCtx }) {
  const svc = useMemo(() => widgetsService(ctx.supabase), [ctx.supabase]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [styles, setStyles] = useState<WidgetStyle[]>([]);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, s] = await Promise.all([svc.getRuler(ctx.storeId), svc.listStyles(ctx.storeId)]);
        setForm({ active: r.active, title: r.title, tiers: r.tiers ?? [], footer: r.footer,
          placement: r.placement ?? EMPTY.placement, style_id: r.style_id });
        setStyles(s);
      } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro ao carregar.' }); }
      finally { setLoading(false); }
    })();
  }, [svc, ctx.storeId]);

  const style = styles.find((s) => s.id === form.style_id) ?? styles.find((s) => s.is_default);
  const cfg = mergeConfig(style?.config);
  const hasContent = form.title.trim() !== '' || form.tiers.length > 0;
  const preview = hasContent ? { title: form.title, tiers: form.tiers, footer: form.footer } : SAMPLE_CONTENT;

  const setTier = (i: number, k: keyof Tier, v: string) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)) }));

  async function persist(next: Form, okText: string) {
    if (next.active && !next.placement.selector.trim()) { setMsg({ ok: false, text: 'Selecione o elemento da loja antes de ativar.' }); return false; }
    if (next.active && next.tiers.filter((t) => t.label.trim() && t.value.trim()).length === 0) {
      setMsg({ ok: false, text: 'Adicione ao menos uma faixa completa antes de ativar.' }); return false;
    }
    setSaving(true); setMsg(null);
    try {
      const clean = { ...next, tiers: next.tiers.filter((t) => t.label.trim() || t.value.trim()) };
      await svc.saveRuler(ctx.storeId, clean);
      setForm(clean);
      setMsg({ ok: true, text: okText });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro ao salvar.' });
      return false;
    } finally { setSaving(false); }
  }

  async function toggleActive() {
    const next = { ...form, active: !form.active };
    const ok = await persist(next, next.active ? 'Régua ativada na loja.' : 'Régua pausada.');
    if (ok) setForm(next);
  }

  if (loading) return <div className="p-8 text-sm text-slate-400">Carregando...</div>;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Ruler className="h-6 w-6 text-[#0094EB]" />
            <h1 className="text-2xl font-extrabold text-slate-900">Régua de descontos</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Régua informativa exibida na loja. O desconto real é configurado na plataforma da loja.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <button type="button" role="switch" aria-checked={form.active} onClick={toggleActive} disabled={saving}
              className={`relative h-6 w-11 rounded-full transition ${form.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.active ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            {form.active ? 'Ativa na loja' : 'Rascunho / pausada'}
          </div>
          <button type="button" onClick={() => persist(form, 'Régua salva.')} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0094EB] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {msg && <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-extrabold uppercase text-slate-800">1. Conteúdo</h2>
            <label className="block"><span className={labelCls}>Título</span>
              <input className={inputCls} value={form.title} placeholder={SAMPLE_CONTENT.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>

            <div className="mt-4">
              <span className={labelCls}>Faixas da régua (até 6)</span>
              <div className="space-y-2">
                {form.tiers.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input className={inputCls} value={t.label} placeholder="2 peças" onChange={(e) => setTier(i, 'label', e.target.value)} />
                    <input className={inputCls} value={t.value} placeholder="5% OFF" onChange={(e) => setTier(i, 'value', e.target.value)} />
                    <button type="button" onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, x) => x !== i) })}
                      className="rounded-xl border border-slate-200 px-3 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              {form.tiers.length < 6 && (
                <button type="button" onClick={() => setForm({ ...form, tiers: [...form.tiers, { label: '', value: '' }] })}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600">
                  <Plus className="h-3.5 w-3.5" /> Adicionar faixa
                </button>
              )}
            </div>

            <label className="mt-4 block"><span className={labelCls}>Rodapé</span>
              <input className={inputCls} value={form.footer} placeholder={SAMPLE_CONTENT.footer}
                onChange={(e) => setForm({ ...form, footer: e.target.value })} /></label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-extrabold uppercase text-slate-800">2. Posição na loja</h2>
            <WidgetPlacementPicker supabase={ctx.supabase} storeId={ctx.storeId} storeUrl={ctx.storeUrl}
              value={form.placement} onChange={(p: Placement) => setForm({ ...form, placement: p })} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-extrabold uppercase text-slate-800">3. Estilo</h2>
            <label className="block"><span className={labelCls}>Estilo da régua</span>
              <select className={inputCls} value={form.style_id ?? ''} onChange={(e) => setForm({ ...form, style_id: e.target.value || null })}>
                <option value="">Padrão da loja{style ? ` (${style.name})` : ''}</option>
                {styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></label>
            <p className="mt-2 text-xs text-slate-400">
              {styles.length === 0 ? 'Nenhum estilo criado: será usado o visual padrão. ' : ''}
              Crie e edite estilos na página <b>Aparência</b>.
            </p>
          </section>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase text-slate-800">Preview</h2>
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
    </div>
  );
}
