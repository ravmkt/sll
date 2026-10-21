export type BillingCycle = 'monthly' | 'semiannual' | 'yearly';

const MONTHS: Record<BillingCycle, number> = { monthly: 1, semiannual: 6, yearly: 12 };

export type CyclePrices = {
  monthly: number | null;
  semiannual: number | null;
  yearly: number | null;
};

/** Desconto (%) do ciclo em relação a pagar mensalmente. */
export function cycleDiscountPct(p: CyclePrices, cycle: BillingCycle): number {
  const m = Number(p.monthly) || 0;
  const c = Number(p[cycle]) || 0;
  if (cycle === 'monthly' || m <= 0 || c <= 0) return 0;
  const pct = Math.round((1 - c / (m * MONTHS[cycle])) * 100);
  return pct > 0 ? pct : 0;
}

/** Rótulo exato para um plano. Ex.: "17% OFF". */
export function cycleDiscountLabel(p: CyclePrices, cycle: BillingCycle): string | null {
  const pct = cycleDiscountPct(p, cycle);
  return pct > 0 ? `${pct}% OFF` : null;
}

/** Rótulo genérico para o seletor de ciclo (vários planos). Ex.: "até 36% OFF". */
export function maxCycleDiscountLabel(plans: CyclePrices[], cycle: BillingCycle): string | null {
  const max = plans.reduce((a, p) => Math.max(a, cycleDiscountPct(p, cycle)), 0);
  return max > 0 ? `até ${max}% OFF` : null;
}
