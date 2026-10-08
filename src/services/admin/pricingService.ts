import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export async function getPlanSubscribers(): Promise<Record<string, number>> {
  const { data, error } = await sb.rpc('admin_plan_subscribers');
  if (error) throw new Error(error.message);
  return (data || {}) as Record<string, number>;
}

export async function createDynamicPlan(data: Record<string, unknown>): Promise<string> {
  const { data: id, error } = await sb.rpc('admin_create_dynamic_plan', { p_data: data });
  if (error) throw new Error(error.message);
  return id as string;
}