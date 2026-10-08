import { useCallback, useEffect, useState } from 'react';
import type { DynamicPlan } from '@/services/admin/plansAdmin';
import type { ComboModuleRow } from '@/services/admin/combosAdmin';
import {
  MARGIN_NA, buildCalc, computeMargin, getCostSettings, getDiscounts, getFxAlert, getOverrides, getPayingStores, syncFx,
  type Calc, type CostSettings, type Limits, type Margin, type Prices,
} from '@/services/admin/costsAdmin';

export type MarginAlert = { plan: DynamicPlan; margin: Margin };

export function usePricingCosts(plans: DynamicPlan[] | null, comboMods: ComboModuleRow[]) {
  const [settings, setSettings] = useState<CostSettings | null>(null);
  const [paying, setPaying] = useState(0);
  const [discounts, setDiscounts] = useState<Record<string, number>>({});
  const [overrides, setOverrides] = useState<Record<string, Record<string, Limits>>>({});
  const [fx, setFx] = useState<{ rate: number; avg: number } | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        let s = await getCostSettings();
        if (s && s.auto_sync_currency) {
          const last = s.last_currency_sync_at ? new Date(s.last_currency_sync_at).getTime() : 0;
          if (new Date(last).toLocaleDateString('en-CA') !== new Date().toLocaleDateString('en-CA')) {
            try { s = await syncFx(); } catch { /* mantem a cotacao salva */ }
          }
        }
        const [p, d, o, f] = await Promise.all([
          getPayingStores().catch(() => 0),
          getDiscounts(),
          getOverrides(),
          s ? getFxAlert(s.usd_to_brl_rate).catch(() => null) : Promise.resolve(null),
        ]);
        if (off) return;
        setSettings(s); setPaying(p); setDiscounts(d); setOverrides(o); setFx(f);
      } catch {
        if (!off) setSettings(null);
      }
    })();
    return () => { off = true; };
  }, [plans, tick]);

  const calc: Calc | null = settings ? buildCalc(settings, paying) : null;

  const bestIn = (slug: string, tier: string | null): DynamicPlan | null => {
    const list = (plans || []).filter((p) => !p.is_combo && p.module_slug === slug);
    if (tier) return list.find((p) => p.plan_tier === tier) ?? null;
    const act = list.filter((p) => p.is_active);
    const base = act.length ? act : list;
    return base.reduce<DynamicPlan | null>((b, p) => (!b || p.price_monthly_cents > b.price_monthly_cents ? p : b), null);
  };

  const members = (comboId: string) =>
    comboMods.filter((r) => r.plan_id === comboId).map((r) => ({ row: r, plan: bestIn(r.module_slug, r.member_tier) }));

  // Preco cheio do combo = soma dos planos escolhidos em cada ciclo
  const listPrices = (comboId: string): Prices | null => {
    const mp = members(comboId);
    if (mp.length < 2 || mp.some((x) => !x.plan)) return null;
    return {
      m: mp.reduce((t, x) => t + (x.plan!.price_monthly_cents || 0), 0),
      s: mp.reduce((t, x) => t + (x.plan!.price_semiannual_cents || 0), 0),
      a: mp.reduce((t, x) => t + (x.plan!.price_annual_cents || 0), 0),
    };
  };

  const marginOf = (p: DynamicPlan): Margin | null => {
    if (!calc) return null;
    const prices: Prices = { m: p.price_monthly_cents, s: p.price_semiannual_cents, a: p.price_annual_cents };
    if (!p.is_combo) return computeMargin(prices, [(p.limits_config ?? {}) as Limits], calc);
    const mp = members(p.id);
    if (!mp.length || mp.some((x) => !x.plan)) return { ...MARGIN_NA, reason: 'Combo sem módulos ou módulo sem plano.' };
    const lims = mp.map((x) => ({ ...((x.plan!.limits_config ?? {}) as Limits), ...(overrides[p.id]?.[x.row.module_slug] ?? {}) }));
    return computeMargin(prices, lims, calc);
  };

  const alerts: MarginAlert[] = [];
  (plans || []).forEach((p) => {
    if (!p.is_active) return;
    const m = marginOf(p);
    if (m && (m.level === 'warn' || m.level === 'low' || m.level === 'loss')) alerts.push({ plan: p, margin: m });
  });

  return { settings, calc, discounts, fx, alerts, listPrices, marginOf, reload };
}