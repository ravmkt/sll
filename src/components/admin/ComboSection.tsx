import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { listDynamicPlans, updateDynamicPlan, type DynamicPlan } from '@/services/admin/plansAdmin';
import { deleteDynamicPlan, getPlanSubscribers } from '@/services/admin/pricingService';
import { listAllComboModules, listHubModules, type ComboModuleRow, type HubModule } from '@/services/admin/combosAdmin';
import { usePricingCosts } from '@/hooks/admin/usePricingCosts';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { PlanDrawer } from '@/components/admin/PrecosTab';
import ComboCreator from '@/components/admin/ComboCreator';
import ComboDiscountCard from '@/components/admin/ComboDiscountCard';
import ComboModulesEditor from '@/components/admin/ComboModulesEditor';
import ComboPricing from '@/components/admin/ComboPricing';
import MarginBadge from '@/components/admin/MarginBadge';
import { CARD, int } from '@/components/admin/moduleUi';

export default function ComboSection() {
  const [plans, setPlans] = useState<DynamicPlan[] | null>(null);
  const [comboMods, setComboMods] = useState<ComboModuleRow[]>([]);
  const [mods, setMods] = useState<HubModule[]>([]);
  const [subs, setSubs] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DynamicPlan | null>(null);
  const [editingMods, setEditingMods] = useState<DynamicPlan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const costs = usePricingCosts(plans, comboMods);

  const load = useCallback(async () => {
    const [p, cm, m, s] = await Promise.all([
      listDynamicPlans(),
      listAllComboModules().catch(() => [] as ComboModuleRow[]),
      listHubModules().catch(() => [] as HubModule[]),
      getPlanSubscribers().catch(() => ({} as Record<string, number>)),
    ]);
    setPlans(p); setComboMods(cm); setMods(m); setSubs(s);
  }, []);

  useEffect(() => { load().catch(() => setPlans([])); }, [load]);

  const modName = useMemo(() => new Map(mods.map((m) => [m.slug, m.name])), [mods]);
  const combos = (plans || []).filter((p) => p.is_combo);
  const line = (id: string) =>
    comboMods.filter((r) => r.plan_id === id).map((r) => {
      const planName = r.member_tier
        ? (plans || []).find((x) => !x.is_combo && x.module_slug === r.module_slug && x.plan_tier === r.member_tier)?.plan_name
        : null;
      return planName || modName.get(r.module_slug) || r.module_slug;
    }).join(' + ') || 'Nenhum módulo definido';

  const refresh = () => { load(); costs.reload(); };

  const toggleActive = async (p: DynamicPlan) => {
    setBusyId(p.id);
    try {
      await updateDynamicPlan(p.id, {
        plan_name: p.plan_name,
        price_monthly_cents: p.price_monthly_cents,
        price_semiannual_cents: p.price_semiannual_cents,
        price_annual_cents: p.price_annual_cents,
        limits_config: p.limits_config ?? {},
        is_recommended: p.is_recommended,
        is_active: !p.is_active,
      });
      toast.success(p.is_active ? 'Combo pausado.' : 'Combo ativado.');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível alterar o status.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: DynamicPlan) => {
    if (!(await confirm({ title: 'Excluir combo', message: `"${p.plan_name}" será apagado e essa ação não pode ser desfeita.`, confirmLabel: 'Excluir' }))) return;
    setBusyId(p.id);
    try {
      await deleteDynamicPlan(p.id);
      toast.success('Combo excluído.');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir.');
    } finally {
      setBusyId(null);
    }
  };

  const btn = 'cursor-pointer rounded-md px-2.5 py-1 text-[13px] font-semibold disabled:opacity-40';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">Combo é um pacote de módulos com preço fechado. O preço é calculado pelo desconto sobre a soma dos planos.</p>
        <button type="button" onClick={() => setCreating(true)} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#fd8539] px-3 py-2 text-[13px] font-bold text-white hover:opacity-90">
          <Plus size={14} /> Novo Combo
        </button>
      </div>

      <ComboDiscountCard />

      {plans === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : combos.length === 0 ? (
        <div className={CARD}><p className="text-[13px] text-slate-500">Nenhum combo cadastrado. Clique em "Novo Combo".</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {combos.map((p) => (
            <div key={p.id} className={`${CARD} space-y-3 shadow-[inset_4px_0_0_0_#facc15]`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-[15px] font-bold text-white"><Layers size={14} className="shrink-0 text-[#fd8539]" /> {p.plan_name}</p>
                  <p className="mt-0.5 text-[13px] text-amber-200/80">{line(p.id)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                  {p.is_active ? 'Ativo' : 'Pausado'}
                </span>
              </div>
              <ComboPricing combo={p} list={costs.listPrices(p.id)} pct={costs.discounts[p.id] ?? 0} onChanged={refresh} />
              <div className="flex items-center justify-center gap-2 text-[13px] text-slate-500"><span>Margem</span><MarginBadge m={costs.marginOf(p)} /></div>
              <p className="text-center text-[13px] text-slate-500">{int(subs[p.id])} assinantes</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                <button type="button" onClick={() => setEditing(p)} className={`${btn} bg-white/5 text-slate-200 hover:bg-white/10`}>Editar</button>
                <button type="button" onClick={() => setEditingMods(p)} className={`${btn} bg-white/5 text-amber-300 hover:bg-white/10`}>Módulos</button>
                <button type="button" disabled={busyId === p.id} onClick={() => toggleActive(p)}
                  className={`${btn} ${p.is_active ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}>
                  {p.is_active ? 'Pausar' : 'Ativar'}
                </button>
                <button type="button" disabled={busyId === p.id || (subs[p.id] || 0) > 0} onClick={() => remove(p)}
                  title={(subs[p.id] || 0) > 0 ? 'Combo com assinantes: use Pausar' : 'Excluir combo'}
                  className={`${btn} bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-30`}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <ComboCreator onCreated={refresh} onClose={() => setCreating(false)} />}
      {editingMods && <ComboModulesEditor combo={editingMods} onClose={() => setEditingMods(null)} onSaved={refresh} />}
      {editing && <PlanDrawer key={editing.id} plan={editing} modules={mods} defaultModule="" onClose={() => setEditing(null)} onSaved={refresh} />}
      {dialog}
    </div>
  );
}