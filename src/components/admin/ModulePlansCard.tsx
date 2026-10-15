import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { listDynamicPlans, updateDynamicPlan, type DynamicPlan } from '@/services/admin/plansAdmin';
import { getModulePlanStats, type PlanStat } from '@/services/admin/modulesService';
import { CARD, INPUT, brl, int } from '@/components/admin/moduleUi';

const toReais = (c: number) => ((Number(c) || 0) / 100).toFixed(2);
const toCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);

function statsText(st?: PlanStat): string {
  const parts = [`${int(st?.total ?? 0)} loja(s)`, `${int(st?.paying ?? 0)} pagante(s)`];
  if (st?.trial) parts.push(`${int(st.trial)} em trial`);
  if (st?.lifetime) parts.push(`${int(st.lifetime)} vitalícia(s)`);
  if (st?.past_due) parts.push(`${int(st.past_due)} inadimplente(s)`);
  return parts.join(' · ');
}

function QuickEdit({ plan, onClose, onSaved }: { plan: DynamicPlan; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(plan.plan_name);
  const [pm, setPm] = useState(toReais(plan.price_monthly_cents));
  const [ps, setPs] = useState(toReais(plan.price_semiannual_cents));
  const [pa, setPa] = useState(toReais(plan.price_annual_cents));
  const [active, setActive] = useState(plan.is_active);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const cents = [toCents(pm), toCents(ps), toCents(pa)];
    if (!name.trim() || cents.some((c) => !Number.isFinite(c) || c < 0)) { toast.error('Valores inválidos.'); return; }
    setBusy(true);
    try {
      await updateDynamicPlan(plan.id, {
        plan_name: name.trim(),
        price_monthly_cents: cents[0],
        price_semiannual_cents: cents[1],
        price_annual_cents: cents[2],
        limits_config: plan.limits_config ?? {},
        is_recommended: plan.is_recommended,
        is_active: active,
      });
      toast.success(`${name.trim()} salvo.`);
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  const F = ({ label, value, set }: { label: string; value: string; set: (v: string) => void }) => (
    <label className="block space-y-1">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input value={value} onChange={(e) => set(e.target.value)} className={INPUT} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className={`${CARD} w-full max-w-md space-y-4`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-white">Editar plano {plan.plan_tier}</p>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <F label="Mensal (R$)" value={pm} set={setPm} />
          <F label="Semestral (R$)" value={ps} set={setPs} />
          <F label="Anual (R$)" value={pa} set={setPa} />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-300">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Plano ativo
        </label>
        <p className="text-xs text-slate-600">O preço vale só para novas assinaturas. Limites e add-ons continuam em Preços.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-[13px] font-bold text-slate-200 hover:bg-white/10">Cancelar</button>
          <button type="button" disabled={busy} onClick={save} className="cursor-pointer rounded-lg bg-[#fd8539] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModulePlansCard({ slug, onManage }: { slug: string; onManage: () => void }) {
  const [plans, setPlans] = useState<DynamicPlan[] | null>(null);
  const [stats, setStats] = useState<Record<string, PlanStat>>({});
  const [editing, setEditing] = useState<DynamicPlan | null>(null);

  const load = useCallback(() => {
    listDynamicPlans()
      .then((p) => setPlans(p.filter((x) => x.module_slug === slug)))
      .catch(() => setPlans([]));
    getModulePlanStats(slug).then(setStats).catch(() => setStats({}));
  }, [slug]);

  useEffect(() => { setPlans(null); load(); }, [load]);

  return (
    <div className={`${CARD} space-y-3`}>
      <p className="flex items-center gap-2 text-[15px] font-bold text-white"><Tag size={14} className="text-[#fd8539]" /> Planos do módulo</p>
      {plans === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : plans.length === 0 ? (
        <p className="text-[13px] text-slate-500">Este módulo ainda não tem planos.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-white">{p.plan_name}</p>
                <p className="text-[13px] text-slate-500">{brl(p.price_monthly_cents)}/mês · {statsText(stats[p.id])}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                  {p.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <button type="button" onClick={() => setEditing(p)} title="Editar preço" className="cursor-pointer rounded-md bg-white/5 p-1.5 text-slate-300 hover:bg-white/10">
                  <Pencil size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-600">Lojas que entram por combo não aparecem nos planos individuais.</p>
      <button type="button" onClick={onManage} className="w-full cursor-pointer rounded-lg bg-white/5 px-3 py-2 text-[13px] font-bold text-slate-200 hover:bg-white/10">
        Limites e add-ons (Preços)
      </button>
      {editing && <QuickEdit plan={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}