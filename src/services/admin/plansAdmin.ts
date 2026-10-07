import { supabase } from '@/lib/supabase';

export type PlanLimits = {
  views?: number | null;
  max_videos?: number | null;
  max_pages?: number | null;
  storage_gb?: number | null;
  tracking?: boolean;
  badge_removable?: boolean;
};

export type DynamicPlan = {
  id: string;
  module_slug: string | null;
  plan_tier: string;
  plan_name: string;
  is_combo: boolean;
  price_monthly_cents: number;
  price_semiannual_cents: number;
  price_annual_cents: number;
  limits_config: PlanLimits | null;
  is_recommended: boolean;
  sort_order: number;
  is_active: boolean;
};

export type PlanAddon = {
  id: string;
  module_slug: string;
  key: string;
  name: string;
  price_monthly_cents: number;
  grants: Record<string, number>;
  is_active: boolean;
};

export async function listDynamicPlans(): Promise<DynamicPlan[]> {
  const { data, error } = await (supabase as any)
    .from('dynamic_plans')
    .select('*')
    .order('module_slug', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DynamicPlan[];
}

export async function listPlanAddons(): Promise<PlanAddon[]> {
  const { data, error } = await (supabase as any)
    .from('plan_addons')
    .select('*')
    .order('module_slug', { ascending: true })
    .order('key', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanAddon[];
}

export async function updateDynamicPlan(id: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase as any).rpc('admin_update_dynamic_plan', { p_id: id, p_data: data });
  if (error) throw new Error(error.message);
}

export async function updatePlanAddon(id: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase as any).rpc('admin_update_plan_addon', { p_id: id, p_data: data });
  if (error) throw new Error(error.message);
}