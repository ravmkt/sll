import { supabase } from "@/lib/supabase";

export type CatalogPlan = {
  id: string;
  plan_tier: string;
  plan_name: string;
  module_slug: string;
  price_monthly_cents: number;
  price_semiannual_cents: number;
  price_annual_cents: number;
  sort_order: number;
};

const sb: any = supabase;

// Planos de venda: apenas modulos ativos e "a venda" no Master (hub_modules)
export async function getCatalogShowcase(): Promise<CatalogPlan[]> {
  const { data: mods, error: modErr } = await sb
    .from("hub_modules")
    .select("slug")
    .eq("status", "active")
    .eq("is_public_for_sale", true);
  if (modErr) console.error("[getCatalogShowcase] hub_modules:", modErr.message);

  const slugs: string[] = (mods ?? []).map((m: any) => m.slug);
  if (!slugs.length) return [];

  const { data, error } = await sb
    .from("dynamic_plans")
    .select("id, plan_tier, plan_name, module_slug, price_monthly_cents, price_semiannual_cents, price_annual_cents, sort_order")
    .eq("is_active", true)
    .eq("is_combo", false)
    .in("module_slug", slugs)
    .order("sort_order", { ascending: true });
  if (error) console.error("[getCatalogShowcase] dynamic_plans:", error.message);

  return (data ?? []).map((p: any) => ({
    ...p,
    price_monthly_cents: Number(p.price_monthly_cents ?? 0),
    price_semiannual_cents: Number(p.price_semiannual_cents ?? 0),
    price_annual_cents: Number(p.price_annual_cents ?? 0),
  })) as CatalogPlan[];
}