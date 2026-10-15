import { supabase } from "@/lib/supabase";

export type BillingCycle = "monthly" | "semiannual" | "yearly";

export type StoreSubscription = {
  id: string;
  store_id: string;
  plan_id: string;
  status: string;
  billing_cycle: BillingCycle;
  current_period_start: string | null;
  current_period_end: string | null;
  module_key: string | null;
  is_prorated: boolean;
  prorated_amount_cents: number | null;
  asaas_subscription_id: string | null;
  price_cents: number;
  plan: {
    id: string;
    name: string;
    slug: string;
    price_cents: number;
    modules: string[];
    is_active: boolean;
  } | null;
};

async function getActiveSubscriptionsBase(storeId: string): Promise<StoreSubscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `id, store_id, plan_id, status, billing_cycle,
       current_period_start, current_period_end,
       module_key, is_prorated, prorated_amount_cents, asaas_subscription_id,
       plan:plans(id, name, slug, price_cents, modules, is_active)`
    )
    .eq("store_id", storeId)
    .in("status", ["active", "trialing", "lifetime", "past_due"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getActiveSubscriptions] erro:", error.message);
    return [];
  }

  const subs = (data ?? []) as unknown as (Omit<StoreSubscription, "price_cents">)[];

  // Busca o preço real por ciclo em plan_prices (evita mostrar preço mensal em plano anual)
  const planIds = [...new Set(subs.map((s) => s.plan_id).filter((id): id is string => !!id && id !== "null"))];
  const { data: prices } = await supabase
    .from("plan_prices")
    .select("plan_id, billing_cycle, price_cents")
    .in("plan_id", planIds.length ? planIds : ["00000000-0000-0000-0000-000000000000"]);

  const priceMap = new Map(
    (prices ?? []).map((p) => [`${p.plan_id}_${p.billing_cycle}`, p.price_cents])
  );

  return subs.map((s) => ({
    ...s,
    price_cents:
      priceMap.get(`${s.plan_id}_${s.billing_cycle}`) ?? s.plan?.price_cents ?? 0,
  }));
}

export async function getStoreBillingAnchor(storeId: string): Promise<number | null> {
  const { data } = await supabase
    .from("stores")
    .select("billing_anchor_day")
    .eq("id", storeId)
    .maybeSingle();

  return data?.billing_anchor_day ?? null;
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-cancel-subscription`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription_id: subscriptionId }),
    }
  );

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result?.error ?? "Erro ao cancelar assinatura.");
  }
}

export async function getActiveSubscriptions(...args: Parameters<typeof getActiveSubscriptionsBase>): Promise<Awaited<ReturnType<typeof getActiveSubscriptionsBase>>> {
  const rows = await getActiveSubscriptionsBase(...args);
  return (await enrichSubscriptions(rows as any)) as any;
}

// ---------- Nome, preco e total reais (planos dinamicos + add-ons recorrentes) ----------
const CYCLE_MONTHS: Record<string, number> = { monthly: 1, semiannual: 6, yearly: 12, annual: 12 };

async function enrichSubscriptions(rows: any): Promise<any> {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  try {
    const sb: any = supabase;
    const ids = rows.map((r: any) => r?.id).filter(Boolean);
    if (!ids.length) return rows;

    const { data: raw } = await sb
      .from('subscriptions')
      .select('id, store_id, dynamic_plan_id, billing_cycle, module_key')
      .in('id', ids);
    const meta = new Map<string, any>((raw || []).map((r: any) => [r.id, r]));

    const planIds = Array.from(new Set((raw || []).map((r: any) => r.dynamic_plan_id).filter(Boolean)));
    const plans = new Map<string, any>();
    if (planIds.length) {
      const { data } = await sb
        .from('dynamic_plans')
        .select('id, plan_name, is_combo, module_slug, price_monthly_cents, price_semiannual_cents, price_annual_cents')
        .in('id', planIds);
      (data || []).forEach((p: any) => plans.set(p.id, p));
    }

    // Add-ons recorrentes ativos e nao agendados para cancelamento
    const storeId = (raw || [])[0]?.store_id;
    let addons: any[] = [];
    if (storeId) {
      const { data } = await sb
        .from('store_addons')
        .select('*, addon:addons(price_monthly)')
        .eq('store_id', storeId)
        .eq('status', 'active');
      addons = (data || []).filter((a: any) => a.cancel_at_period_end !== true);
    }
    const firstDynamicSubId = (raw || []).find((r: any) => r.dynamic_plan_id)?.id;

    return rows.map((s: any) => {
      const m = meta.get(s?.id);
      const dp = m?.dynamic_plan_id ? plans.get(m.dynamic_plan_id) : null;
      if (!dp) return s;

      const cycle = String(m.billing_cycle || 'monthly').toLowerCase();
      const months = CYCLE_MONTHS[cycle] ?? 1;
      const planCents =
        cycle === 'semiannual' ? dp.price_semiannual_cents
        : cycle === 'yearly' || cycle === 'annual' ? dp.price_annual_cents
        : dp.price_monthly_cents;

      const addonsCents = addons
        .filter((a: any) => a.subscription_id === s.id || (!a.subscription_id && s.id === firstDynamicSubId))
        .reduce((sum: number, a: any) => sum + Math.round(Number(a.addon?.price_monthly ?? 0) * 100 * months) * (Number(a.quantity) || 1), 0);

      const modules = s.plan?.modules ?? (dp.is_combo ? [] : dp.module_slug ? [dp.module_slug] : []);
      return {
        ...s,
        plan_name: dp.plan_name,
        price_cents: Number(planCents) || 0,
        addons_cents: addonsCents,
        plan: {
          ...(s.plan ?? {}),
          name: dp.plan_name,
          modules,
          base_price_cents: Number(planCents) || 0,
          price_cents: (Number(planCents) || 0) + addonsCents,
        },
      };
    });
  } catch (e) {
    console.error('[subscriptions] enriquecimento falhou:', e);
    return rows;
  }
}