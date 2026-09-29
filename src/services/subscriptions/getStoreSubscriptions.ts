import { supabase } from "@/lib/supabase";

export type StoreSubscription = {
  id: string;
  store_id: string;
  plan_id: string;
  status: string;
  billing_cycle: "monthly" | "semiannual" | "annual";
  current_period_start: string | null;
  current_period_end: string | null;
  module_key: string | null;
  is_prorated: boolean;
  prorated_amount_cents: number | null;
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
       module_key, is_prorated, prorated_amount_cents,
       plan:plans(id, name, slug, price_cents, modules, is_active)`
    )
    .eq("store_id", storeId)
    .in("status", ["active", "trialing", "lifetime", "past_due"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getActiveSubscriptions] erro:", error.message);
    return [];
  }

  return (data ?? []) as unknown as StoreSubscription[];
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
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("id", subscriptionId);

  if (error) throw error;
}
