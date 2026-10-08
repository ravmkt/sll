import { supabase } from '@/lib/supabase';

export type HubModule = { slug: string; name: string; status: string };
export type ComboModuleInput = { module_slug: string; member_tier: string | null };
export type ComboModuleRow = { plan_id: string; module_slug: string; member_tier: string | null };

export type ComboInput = {
  plan_name: string;
  plan_tier: string;
  price_monthly_cents: number;
  price_semiannual_cents: number;
  price_annual_cents: number;
  limits_config: Record<string, unknown>;
  is_recommended: boolean;
  is_active: boolean;
  modules: ComboModuleInput[];
};

export async function listHubModules(): Promise<HubModule[]> {
  const { data, error } = await (supabase as any)
    .from('hub_modules')
    .select('slug,name,status')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HubModule[];
}

export async function listComboModules(planId: string): Promise<ComboModuleRow[]> {
  const { data, error } = await (supabase as any)
    .from('combo_modules')
    .select('plan_id,module_slug,member_tier')
    .eq('plan_id', planId);
  if (error) throw new Error(error.message);
  return (data ?? []) as ComboModuleRow[];
}

export async function createCombo(input: ComboInput): Promise<string> {
  const { data, error } = await (supabase as any).rpc('admin_create_combo', { p_data: input });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setComboModules(planId: string, modules: ComboModuleInput[]): Promise<void> {
  const { error } = await (supabase as any).rpc('admin_set_combo_modules', { p_plan_id: planId, p_modules: modules });
  if (error) throw new Error(error.message);
}
export async function listAllComboModules(): Promise<ComboModuleRow[]> {
  const { data, error } = await (supabase as any)
    .from('combo_modules')
    .select('plan_id,module_slug,member_tier');
  if (error) throw new Error(error.message);
  return (data ?? []) as ComboModuleRow[];
}