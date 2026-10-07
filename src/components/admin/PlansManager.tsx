import { useCallback, useEffect, useState } from 'react';
import {
  listDynamicPlans,
  listPlanAddons,
  updateDynamicPlan,
  updatePlanAddon,
  type DynamicPlan,
  type PlanAddon,
} from '@/services/admin/plansAdmin';

type Msg = { type: 'ok' | 'err'; text: string } | null;

const toReais = (c: number) => (c / 100).toFixed(2);
const toCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);
const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
const toStr = (v: unknown) => (typeof v === 'number' ? String(v) : '');
const inputCls = 'w-full rounded-md border border-slate-300 px-2 py-1 text-sm';

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs text-slate-500">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  );
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-700">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function PlanEditor({ plan, onDone }: { plan: DynamicPlan; onDone: (m: Msg) => void }) {
  const lim = plan.limits_config ?? {};
  const [name, setName] = useState(plan.plan_name);
  const [pm, setPm] = useState(toReais(plan.price_monthly_cents));
  const [ps, setPs] = useState(toReais(plan.price_semiannual_cents));
  const [pa, setPa] = useState(toReais(plan.price_annual_cents));
  const [views, setViews] = useState(toStr(lim.views));
  const [videos, setVideos] = useState(toStr(lim.max_videos));
  const [pages, setPages] = useState(toStr(lim.max_pages));
  const [storage, setStorage] = useState(toStr(lim.storage_gb));
  const [tracking, setTracking] = useState(!!lim.tracking);
  const [badge, setBadge] = useState(!!lim.badge_removable);
  const [rec, setRec] = useState(plan.is_recommended);
  const [active, setActive] = useState(plan.is_active);
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = [toCents(pm), toCents(ps), toCents(pa)];
    const nums = [toNum(views), toNum(videos), toNum(pages), toNum(storage)];
    const badMoney = cents.some((c) => !Number.isFinite(c) || c < 0);
    const badNum = nums.some((n) => n !== null && (!Number.isFinite(n) || n < 0));
    if (!name.trim() || badMoney || badNum) {
      onDone({ type: 'err', text: `Valores inválidos em ${plan.plan_name}.` });
      return;
    }
    setSaving(true);
    try {
      await updateDynamicPlan(plan.id, {
        plan_name: name.trim(),
        price_monthly_cents: cents[0],
        price_semiannual_cents: cents[1],
        price_annual_cents: cents[2],
        limits_config: {
          ...(plan.limits_config ?? {}),
          views: nums[0],
          max_videos: nums[1],
          max_pages: nums[2],
          storage_gb: nums[3],
          tracking,
          badge_removable: badge,
        },
        is_recommended: rec,
        is_active: active,
      });
      onDone({ type: 'ok', text: `${name.trim()} salvo.` });
    } catch (e) {
      onDone({ type: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-400">
          {plan.module_slug ?? 'combo'} · {plan.plan_tier}
        </span>
        <div className="flex gap-4">
          <Check label="Recomendado" value={rec} onChange={setRec} />
          <Check label="Ativo" value={active} onChange={setActive} />
        </div>
      </div>
      <div className="space-y-3">
        <Field label="Nome" value={name} onChange={setName} />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Mensal (R$)" value={pm} onChange={setPm} />
          <Field label="Semestral (R$)" value={ps} onChange={setPs} />
          <Field label="Anual (R$)" value={pa} onChange={setPa} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Plays/mês" value={views} onChange={setViews} placeholder="vazio = ilimitado" />
          <Field label="Vídeos" value={videos} onChange={setVideos} placeholder="vazio = ilimitado" />
          <Field label="Páginas" value={pages} onChange={setPages} placeholder="vazio = ilimitado" />
          <Field label="Storage (GB)" value={storage} onChange={setStorage} placeholder="vazio = ilimitado" />
        </div>
        <div className="flex gap-4">
          <Check label="Tracking" value={tracking} onChange={setTracking} />
          <Check label="Remove selo" value={badge} onChange={setBadge} />
        </div>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-lg bg-[#0094eb] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
}

function AddonRow({ addon, onDone }: { addon: PlanAddon; onDone: (m: Msg) => void }) {
  const [name, setName] = useState(addon.name);
  const [price, setPrice] = useState(toReais(addon.price_monthly_cents));
  const [active, setActive] = useState(addon.is_active);
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = toCents(price);
    if (!name.trim() || !Number.isFinite(cents) || cents < 0) {
      onDone({ type: 'err', text: `Valores inválidos no add-on ${addon.name}.` });
      return;
    }
    setSaving(true);
    try {
      await updatePlanAddon(addon.id, { name: name.trim(), price_monthly_cents: cents, is_active: active });
      onDone({ type: 'ok', text: `Add-on ${name.trim()} salvo.` });
    } catch (e) {
      onDone({ type: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_120px_auto_auto] items-end gap-3 py-3">
      <Field label={`${addon.module_slug} · ${addon.key}`} value={name} onChange={setName} />
      <Field label="Mensal (R$)" value={price} onChange={setPrice} />
      <Check label="Ativo" value={active} onChange={setActive} />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-[#0094eb] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {saving ? '...' : 'Salvar'}
      </button>
    </div>
  );
}

export default function PlansManager() {
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [addons, setAddons] = useState<PlanAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([listDynamicPlans(), listPlanAddons()]);
      setPlans(p);
      setAddons(a);
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = (m: Msg) => {
    setMsg(m);
    if (m?.type === 'ok') load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planos e add-ons</h1>
        <p className="text-sm text-slate-500">Catálogo dinâmico. Alterações não mudam assinaturas já ativas.</p>
      </div>

      {msg && (
        <p className={`rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <PlanEditor key={p.id} plan={p} onDone={done} />
            ))}
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">Add-ons</h2>
            <div className="divide-y divide-slate-100">
              {addons.map((a) => (
                <AddonRow key={a.id} addon={a} onDone={done} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}