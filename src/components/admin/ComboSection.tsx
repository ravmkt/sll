import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Loader2, Plus } from 'lucide-react';
import { listDynamicPlans, type DynamicPlan } from '@/services/admin/plansAdmin';
import { listAllComboModules, listHubModules, type ComboModuleRow, type HubModule } from '@/services/admin/combosAdmin';
import { usePricingCosts } from '@/hooks/admin/usePricingCosts';
import ComboCreator from '@/components/admin/ComboCreator';
import ComboDiscountCard from '@/components/admin/ComboDiscountCard';
import ComboModulesEditor from '@/components/admin/ComboModulesEditor';
import ComboPricing from '@/components/admin/ComboPricing';
import { CARD } from '@/components/admin/moduleUi';

export default function ComboSection() {
  const [plans, setPlans] = useState<DynamicPlan[] | null>(null);
  const [comboMods, setComboMods] = useState<ComboModuleRow[]>([]);
  const [mods, setMods] = useState<HubModule[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingMods, setEditingMods] = useState<DynamicPlan | null>(null);
  const costs = usePricingCosts(plans, comboMods);

  const load = useCallback(async () => {
    const [p, cm, m] = await Promise.all([
      listDynamicPlans(),
      listAllComboModules().catch(() => [] as ComboModuleRow[]),
      listHubModules().catch(() => [] as HubModule[]),
    ]);
    setPlans(p); setComboMods(cm); setMods(m);
  }, []);

  useEffect(() => { load().catch(() => setPlans([])); }, [load]);

  const modName = useMemo(() => new Map(mods.map((m) => [m.slug, m.name])), [mods]);
  const combos = (plans || []).filter((p) => p.is_combo);
  const line = (id: string) =>
    comboMods.filter((r) => r.plan_id === id).map((r) => modName.get(r.module_slug) || r.module_slug).join(' + ') || 'Nenhum módulo definido';

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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {combos.map((p) => (
            <div key={p.id} className={`${CARD} space-y-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-[15px] font-bold text-white"><Layers size={14} className="shrink-0 text-[#fd8539]" /> {p.plan_name}</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">{line(p.id)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                  {p.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <ComboPricing combo={p} list={costs.listPrices(p.id)} pct={costs.discounts[p.id] ?? 0} onChanged={() => { load(); costs.reload(); }} />
              <button type="button" onClick={() => setEditingMods(p)} className="w-full cursor-pointer rounded-lg bg-white/5 px-3 py-2 text-[13px] font-bold text-slate-200 hover:bg-white/10">
                Editar módulos do combo
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && <ComboCreator onCreated={() => { load(); costs.reload(); }} onClose={() => setCreating(false)} />}
      {editingMods && <ComboModulesEditor combo={editingMods} onClose={() => setEditingMods(null)} onSaved={() => { load(); costs.reload(); }} />}
    </div>
  );
}