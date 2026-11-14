import { supabase } from '@/lib/supabase';

export type TryOnOverview = Record<string, unknown>;
export type TryOnSettings = Record<string, unknown>;

export async function getOverview(storeId: string): Promise<TryOnOverview> {
  const { data, error } = await supabase.rpc('tryon_admin_overview', { p_store_id: storeId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? {}) as TryOnOverview;
}

export async function getSettings(storeId: string): Promise<TryOnSettings> {
  const { data, error } = await supabase.rpc('tryon_admin_get_settings', { p_store_id: storeId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? {}) as TryOnSettings;
}