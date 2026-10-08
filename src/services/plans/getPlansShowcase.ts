import { supabase } from "@/lib/supabase";

export type PlanPrice = {
  plan_id: string;
  billing_cycle: "monthly" | "semiannual" | "yearly";
  price_cents: number;
  is_active: boolean;
};

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  modules: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  views_limit: number;
  storage_limit_bytes: number;
  pages_limit: number;
  videos_limit: number | null;
  allows_live: boolean | null;
};

export type PlanObjective = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  plan_id: string;
  sort_order: number;
  is_active: boolean;
  modules: string[];
};

export type PlanKind = "individual" | "objective" | "total";

export function getPlanKind(slug: string): PlanKind {
  if (slug.startsWith("individual-")) return "individual";
  if (slug === "pacote-total") return "total";
  return "objective";
}

export async function getPlansShowcase(): Promise<{
  plans: Plan[];
  prices: PlanPrice[];
  objectives: PlanObjective[];
}> {
  const [{ data: plans, error: plansErr }, { data: prices, error: pricesErr }, { data: objectives, error: objErr }] =
    await Promise.all([
      supabase.from("plans").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("plan_prices").select("*").eq("is_active", true),
      supabase
        .from("plan_objectives")
        .select("*, plan_objective_modules(module_key)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (plansErr) console.error("[getPlansShowcase] plans:", plansErr.message);
  if (pricesErr) console.error("[getPlansShowcase] prices:", pricesErr.message);
  if (objErr) console.error("[getPlansShowcase] objectives:", objErr.message);

  const normalizedObjectives: PlanObjective[] = (objectives ?? []).map((o: any) => ({
    id: o.id,
    slug: o.slug,
    name: o.name,
    description: o.description,
    plan_id: o.plan_id,
    sort_order: o.sort_order,
    is_active: o.is_active,
    modules: (o.plan_objective_modules ?? []).map((m: any) => m.module_key),
  }));

  return {
    plans: (plans ?? []) as Plan[],
    prices: (prices ?? []) as PlanPrice[],
    objectives: normalizedObjectives,
  };
}

export function getPriceForCycle(
  planId: string,
  cycle: "monthly" | "semiannual" | "yearly",
  prices: PlanPrice[],
  fallbackCents: number
): number {
  const found = prices.find((p) => p.plan_id === planId && p.billing_cycle === cycle);
  return found ? found.price_cents : fallbackCents;
}

export async function subscribeToPlan(params: {
  storeId: string;
  planId: string;
  billingCycle: "monthly" | "semiannual" | "yearly";
  moduleKey?: string | null; couponCode?: string | null;
}): Promise<{ invoiceUrl?: string; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return { error: "SESSAO_EXPIRADA" };
  }

  const { data, error } = await supabase.functions.invoke("asaas-create-subscription", {
    body: {
      plan_id: params.planId,
      store_id: params.storeId,
      billing_cycle: params.billingCycle.toUpperCase(),
      module_key: params.moduleKey ?? null, coupon_code: params.couponCode ?? null,
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let body = data;
  if (error && (error as any).context) {
    try {
      body = await (error as any).context.json();
    } catch (_) {}
  }

  if (error || body?.error) {
    return { error: body?.message || body?.error || "ERRO_DESCONHECIDO" };
  }

  return { invoiceUrl: body?.invoice_url };
}
export async function subscribeToDynamicPlan(params: {
  storeId: string;
  dynamicPlanId: string;
  billingCycle: "monthly" | "semiannual" | "yearly";
  couponCode?: string | null;
}): Promise<{ invoiceUrl?: string; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "SESSAO_EXPIRADA" };

  const { data, error } = await supabase.functions.invoke("asaas-create-subscription", {
    body: {
      dynamic_plan_id: params.dynamicPlanId,
      store_id: params.storeId,
      billing_cycle: params.billingCycle.toUpperCase(),
      coupon_code: params.couponCode ?? null,
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let body = data;
  if (error && (error as any).context) {
    try {
      body = await (error as any).context.json();
    } catch (_) {}
  }
  if (error || body?.error) {
    return { error: body?.message || body?.error || "ERRO_DESCONHECIDO" };
  }
  return { invoiceUrl: body?.invoice_url };
}
