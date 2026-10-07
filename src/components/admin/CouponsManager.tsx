import { useCallback, useEffect, useState } from 'react';
import {
  listCoupons,
  listPlanOptions,
  saveCoupon,
  type Coupon,
  type PlanOption,
} from '@/services/admin/couponsAdmin';

type Msg = { type: 'ok' | 'err'; text: string } | null;
type Form = {
  id: string | null;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: string;
  max: string;
  expires: string;
  planIds: string[];
  active: boolean;
};

const EMPTY: Form = { id: null, code: '', type: 'percentage', value: '', max: '', expires: '', planIds: [], active: true };
const inputCls = 'w-full rounded-md border border-slate-300 px-2 py-1 text-sm';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtValue = (c: Coupon) => (c.discount_type === 'percentage' ? `${c.discount_value}%` : brl(c.discount_value));

function toInput(c: Coupon): Form {
  return {
    id: c.id,
    code: c.code,
    type: c.discount_type,
    value: c.discount_type === 'percentage' ? String(c.discount_value) : (c.discount_value / 100).toFixed(2),
    max: c.max_uses === null ? '' : String(c.max_uses),
    expires: c.expires_at ? c.expires_at.slice(0, 10) : '',
    planIds: c.applicable_plan_ids ?? [],
    active: c.is_active,
  };
}

export default function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([listCoupons(), listPlanOptions()]);
      setCoupons(c);
      setPlans(p);
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(f: Form) {
    const raw = Number(f.value.replace(',', '.'));
    const value = f.type === 'percentage' ? Math.round(raw) : Math.round(raw * 100);
    const max = f.max.trim() === '' ? null : Number(f.max);
    if (!f.code.trim() || !Number.isFinite(value) || value <= 0 || (f.type === 'percentage' && value > 100)) {
      setMsg({ type: 'err', text: 'Confira o código e o valor do desconto.' });
      return false;
    }
    if (max !== null && (!Number.isInteger(max) || max <= 0)) {
      setMsg({ type: 'err', text: 'Limite de usos inválido.' });
      return false;
    }
    setSaving(true);
    try {
      await saveCoupon(f.id, {
        code: f.code,
        discount_type: f.type,
        discount_value: value,
        max_uses: max,
        expires_at: f.expires ? new Date(`${f.expires}T23:59:59`).toISOString() : null,
        applicable_plan_ids: f.planIds,
        is_active: f.active,
      });
      setMsg({ type: 'ok', text: f.id ? 'Cupom atualizado.' : 'Cupom criado.' });
      await load();
      return true;
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    const f = toInput(c);
    f.active = !c.is_active;
    await submit(f);
  }

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const togglePlan = (id: string) =>
    setForm((f) =>
      f ? { ...f, planIds: f.planIds.includes(id) ? f.planIds.filter((x) => x !== id) : [...f.planIds, id] } : f,
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cupons de desconto</h1>
          <p className="text-sm text-slate-500">Valor fixo em reais; porcentagem de 1 a 100.</p>
        </div>
        <button
          type="button"
          onClick={() => { setMsg(null); setForm({ ...EMPTY }); }}
          className="rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-semibold text-white"
        >
          Novo cupom
        </button>
      </div>

      {msg && (
        <p className={`rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      {form && (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold text-slate-900">{form.id ? 'Editar cupom' : 'Novo cupom'}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <label className="text-xs text-slate-500">Código
              <input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className={inputCls} />
            </label>
            <label className="text-xs text-slate-500">Tipo
              <select value={form.type} onChange={(e) => set({ type: e.target.value as Form['type'] })} className={inputCls}>
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed_amount">Valor fixo (R$)</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">{form.type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
              <input value={form.value} onChange={(e) => set({ value: e.target.value })} className={inputCls} />
            </label>
            <label className="text-xs text-slate-500">Máx. de usos
              <input value={form.max} onChange={(e) => set({ max: e.target.value })} placeholder="vazio = ilimitado" className={inputCls} />
            </label>
            <label className="text-xs text-slate-500">Expira em
              <input type="date" value={form.expires} onChange={(e) => set({ expires: e.target.value })} className={inputCls} />
            </label>
          </div>
          <div>
            <p className="text-xs text-slate-500">Planos aceitos (nenhum marcado = todos)</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {plans.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={form.planIds.includes(p.id)} onChange={() => togglePlan(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
            Ativo
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={async () => { if (await submit(form)) setForm(null); }}
              className="rounded-lg bg-[#0094eb] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700">
              Cancelar
            </button>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Desconto</th>
              <th className="px-4 py-3">Usos</th>
              <th className="px-4 py-3">Planos</th>
              <th className="px-4 py-3">Expira</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Carregando...</td></tr>}
            {!loading && coupons.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Nenhum cupom cadastrado.</td></tr>
            )}
            {coupons.map((c) => {
              const expired = !!c.expires_at && new Date(c.expires_at) < new Date();
              return (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{c.code}</td>
                  <td className="px-4 py-3">{fmtValue(c)}</td>
                  <td className="px-4 py-3">{c.times_used}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}</td>
                  <td className="px-4 py-3">{c.applicable_plan_ids?.length ? `${c.applicable_plan_ids.length} plano(s)` : 'Todos'}</td>
                  <td className="px-4 py-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${!c.is_active ? 'bg-slate-100 text-slate-600' : expired ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {!c.is_active ? 'Inativo' : expired ? 'Expirado' : 'Ativo'}
                    </span>
                  </td>
                  <td className="space-x-3 px-4 py-3 text-right text-xs">
                    <button type="button" onClick={() => { setMsg(null); setForm(toInput(c)); }} className="text-sky-600 underline">Editar</button>
                    <button type="button" onClick={() => toggle(c)} className="text-slate-600 underline">{c.is_active ? 'Desativar' : 'Ativar'}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}