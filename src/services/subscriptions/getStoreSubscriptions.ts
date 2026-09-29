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

export async function getActiveSubscriptions(storeId: string): Promise<StoreSubscription[]> {
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
  const planIds = [...new Set(subs.map((s) => s.plan_id))];
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
