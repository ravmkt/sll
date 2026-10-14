import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";

export const CYCLE_MONTHS: Record<PlanCycle, number> = { monthly: 1, semiannual: 6, yearly: 12 };

export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function cycleCents(
  p: { price_monthly_cents: number; price_semiannual_cents: number; price_annual_cents: number },
  c: PlanCycle
) {
  return c === "monthly" ? p.price_monthly_cents : c === "semiannual" ? p.price_semiannual_cents : p.price_annual_cents;
}