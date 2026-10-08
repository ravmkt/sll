import { useEffect, useMemo, useState } from 'react';
import { listDynamicPlans, type DynamicPlan } from '@/services/admin/plansAdmin';
import { createCombo, listHubModules, type HubModule } from '@/services/admin/combosAdmin';

const toCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);
const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
const inputCls = 'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100';
const LIMIT_KEYS = ['views', 'max_videos', 'max_pages', 'storage_gb'] as const;
type LimitKey = (typeof LIMIT_KEYS)[number];

// Maior plano ativo do módulo (maior preço mensal); se nenhum ativo, o maior de todos
const bestPlan = (list: DynamicPlan[]): DynamicPlan | null => {
  const act = list.filter((p) => p.is_active);
  const base = act.length ? act : list;
  return base.reduce<DynamicPlan | null>((b, p) => (!b || p.price_monthly_cents > b.price_monthly_cents ? p : b), null);
};

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  );
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-300">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function ComboCreator({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [modules, setModules] = useState<HubModule[]>([]);
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [tier, setTier] = useState('');
  const [pm, setPm] = useState('0,00');
  const [ps, setPs] = useState('0,00');
  const [pa, setPa] = useState('0,00');
  const [views, setViews] = useState('');
  const [videos, setVideos] = useState('');
  const [pages, setPages] = useState('');
  const [storage, setStorage] = useState('');
  const [tracking, setTracking] = useState(true);
  const [badge, setBadge] = useState(true);
  const [rec, setRec] = useState(false);
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([listHubModules(), listDynamicPlans()])
      .then(([m, p]) => {
        setModules(m);
        setPlans(p.filter((x) => !x.is_combo));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const tiersByModule = useMemo(() => {
    const map: Record<string, DynamicPlan[]> = {};
    plans.forEach((p) => {
      if (!p.module_slug) return;
      (map[p.module_slug] ??= []).push(p);
    });
    return map;
  }, [plans]);

  // Soma dos planos escolhidos (null/vazio = ilimitado)
  const suggested = useMemo(() => {
    const slugs = Object.keys(picked);
    if (slugs.length === 0) return null;
    const acc: Record<LimitKey, { unl: boolean; total: number; seen: boolean }> = {
      views: { unl: false, total: 0, seen: false },
      max_videos: { unl: false, total: 0, seen: false },
      max_pages: { unl: false, total: 0, seen: false },
      storage_gb: { unl: false, total: 0, seen: false },
    };
    let tr = false;
    let bd = false;
    let monthly = 0;
    slugs.forEach((slug) => {
      const list = tiersByModule[slug] ?? [];
      const plan = list.find((p) => p.plan_tier === picked[slug]) ?? bestPlan(list);
      if (!plan) return;
      monthly += plan.price_monthly_cents || 0;
      const lim = (plan.limits_config ?? {}) as Record<string, unknown>;
      LIMIT_KEYS.forEach((k) => {
        if (!(k in lim)) return;
        const v = lim[k];
        acc[k].seen = true;
        if (v === null) acc[k].unl = true;
        else if (typeof v === 'number') acc[k].total += v;
      });
      if (lim.tracking === true) tr = true;
      if (lim.badge_removable === true) bd = true;
    });
    const vals = {} as Record<LimitKey, string>;
    LIMIT_KEYS.forEach((k) => {
      vals[k] = acc[k].seen && !acc[k].unl ? String(acc[k].total) : '';
    });
    return { vals, tracking: tr, badge: bd, monthly };
  }, [picked, tiersByModule]);

  const mark = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const applySuggested = (force: boolean) => {
    if (!suggested) return;
    const t = force ? {} : touched;
    const setters: Record<LimitKey, (v: string) => void> = { views: setViews, max_videos: setVideos, max_pages: setPages, storage_gb: setStorage };
    LIMIT_KEYS.forEach((k) => { if (!t[k]) setters[k](suggested.vals[k]); });
    if (!t.tracking) setTracking(suggested.tracking);
    if (!t.badge) setBadge(suggested.badge);
  };

  useEffect(() => {
    applySuggested(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

  function toggle(slug: string, on: boolean) {
    setPicked((prev) => {
      const next = { ...prev };
      if (on) next[slug] = next[slug] ?? bestPlan(tiersByModule[slug] ?? [])?.plan_tier ?? '';
      else delete next[slug];
      return next;
    });
  }

  async function save() {
    const slugs = Object.keys(picked);
    const cents = [toCents(pm), toCents(ps), toCents(pa)];
    const nums = [toNum(views), toNum(videos), toNum(pages), toNum(storage)];
    if (!name.trim() || !tier.trim()) return setError('Informe nome e chave do combo.');
    if (slugs.length < 2) return setError('Selecione ao menos 2 módulos.');
    if (cents.some((c) => !Number.isFinite(c) || c < 0)) return setError('Preços inválidos.');
    if (nums.some((n) => n !== null && (!Number.isFinite(n) || n < 0))) return setError('Limites inválidos.');
    setError(null);
    setSaving(true);
    try {
      await createCombo({
        plan_name: name.trim(),
        plan_tier: tier.trim().toLowerCase(),
        price_monthly_cents: cents[0],
        price_semiannual_cents: cents[1],
        price_annual_cents: cents[2],
        limits_config: { views: nums[0], max_videos: nums[1], max_pages: nums[2], storage_gb: nums[3], tracking, badge_removable: badge },
        is_recommended: rec,
        is_active: active,
        modules: slugs.map((s) => ({ module_slug: s, member_tier: picked[s] || null })),
      });
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Novo combo</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200">Fechar</button>
        </div>

        {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" value={name} onChange={setName} placeholder="Combo Master" />
              <Field label="Chave (única)" value={tier} onChange={setTier} placeholder="master" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Mensal (R$)" value={pm} onChange={setPm} />
              <Field label="Semestral (R$)" value={ps} onChange={setPs} />
              <Field label="Anual (R$)" value={pa} onChange={setPa} />
            </div>
            {suggested && suggested.monthly > 0 && (
              <p className="-mt-2 text-[11px] text-slate-500">
                Soma dos planos escolhidos: {(suggested.monthly / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por mês.
              </p>
            )}

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Módulos do combo (mínimo 2)</p>
              <div className="space-y-2">
                {modules.map((m) => {
                  const on = m.slug in picked;
                  const tiers = tiersByModule[m.slug] ?? [];
                  return (
                    <div key={m.slug} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2">
                      <Check label={`${m.name}${m.status !== 'active' ? ` (${m.status})` : ''}`} value={on} onChange={(v) => toggle(m.slug, v)} />
                      {on && (
                        tiers.length > 0 ? (
                          <select
                            value={picked[m.slug]}
                            onChange={(e) => setPicked((p) => ({ ...p, [m.slug]: e.target.value }))}
                            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                          >
                            {tiers.map((t) => (
                              <option key={t.id} value={t.plan_tier}>{t.plan_name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-slate-500">Sem planos cadastrados</span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Limites do combo (vazio = ilimitado)</p>
                {suggested && (
                  <button
                    type="button"
                    onClick={() => { setTouched({}); applySuggested(true); }}
                    className="text-[11px] font-semibold text-[#0094eb] hover:underline"
                  >
                    Refazer a partir dos planos
                  </button>
                )}
              </div>
              <p className="mb-2 text-[11px] text-slate-500">Preenchido com a soma dos planos escolhidos. Edite à vontade.</p>
              <div className="grid grid-cols-4 gap-3">
                <Field label="Plays/mês" value={views} onChange={(v) => { setViews(v); mark('views'); }} />
                <Field label="Vídeos" value={videos} onChange={(v) => { setVideos(v); mark('max_videos'); }} />
                <Field label="Páginas" value={pages} onChange={(v) => { setPages(v); mark('max_pages'); }} />
                <Field label="Storage (GB)" value={storage} onChange={(v) => { setStorage(v); mark('storage_gb'); }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                <Check label="Tracking" value={tracking} onChange={(v) => { setTracking(v); mark('tracking'); }} />
                <Check label="Remove selo" value={badge} onChange={(v) => { setBadge(v); mark('badge'); }} />
                <Check label="Recomendado" value={rec} onChange={setRec} />
                <Check label="Ativo (visível para venda)" value={active} onChange={setActive} />
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? 'Criando...' : 'Criar combo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}