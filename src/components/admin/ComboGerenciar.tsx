import type { DynamicPlan } from '@/services/admin/plansAdmin';
import { usePricingCosts } from '@/hooks/admin/usePricingCosts';
import { maxSafeDiscount, standaloneMargin, variableWorstCost } from '@/services/admin/costsAdmin';
import PlanosGerenciar from '@/components/admin/PlanosGerenciar';
import ComboPricing from '@/components/admin/ComboPricing';
import type { PriceGuard } from '@/components/admin/ComboPricing';
import MarginBadge from '@/components/admin/MarginBadge';
import { CARD } from '@/components/admin/moduleUi';

type Costs = ReturnType<typeof usePricingCosts>;

export default function ComboGerenciar({ plan, costs, subs, subtitle, onEdit, onSaved }: {
  plan: DynamicPlan;
  costs: Costs;
  subs: Record<string, number>;
  subtitle: string;
  onEdit: (p: DynamicPlan) => void;
  onSaved: () => void | Promise<void>;
}) {
  const c = costs.calc;
  const lp = costs.listPrices(plan.id);
  const lims = costs.limitsOf(plan);
  const guard: PriceGuard | undefined = c && lp && lims
    ? {
        cost: variableWorstCost(lims, c),
        maxPct: maxSafeDiscount(lp, lims, c),
        worstAt: (pc) => standaloneMargin({ m: Math.round(lp.m * (1 - pc / 100)), s: Math.round(lp.s * (1 - pc / 100)), a: Math.round(lp.a * (1 - pc / 100)) }, lims, c).worst,
      }
    : undefined;
  const refresh = () => { onSaved(); costs.reload(); };

  return (
    <div className="space-y-4">
      <PlanosGerenciar
        title={plan.plan_name}
        plans={[plan]}
        subs={subs}
        showAnchor={false}
        subtitleOf={() => subtitle}
        renderMargin={(p) => <MarginBadge m={costs.marginOf(p)} />}
        onEdit={onEdit}
        onSaved={onSaved}
      />
      <section className={`${CARD} space-y-3`}>
        <p className="text-[15px] font-bold text-yellow-300">Desconto do combo</p>
        <ComboPricing combo={plan} guard={guard} list={lp} pct={costs.discounts[plan.id] ?? 0} onChanged={refresh} />
      </section>
    </div>
  );
}