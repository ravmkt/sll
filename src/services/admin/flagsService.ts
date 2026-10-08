import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type FlagMode = 'off' | 'stores' | 'all';

export type FeatureFlag = {
  id: string;
  module_slug: string;
  key: string;
  name: string;
  description: string | null;
  mode: FlagMode;
  stores: { id: string; name: string | null }[];
};

export async function listFlags(slug: string): Promise<FeatureFlag[]> {
  const { data, error } = await sb.rpc('admin_list_feature_flags', { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data || []) as FeatureFlag[];
}

export async function saveFlag(
  id: string | null, slug: string, key: string, name: string, description: string, mode: FlagMode,
): Promise<string> {
  const { data, error } = await sb.rpc('admin_save_feature_flag', {
    p_id: id, p_slug: slug, p_key: key, p_name: name, p_description: description, p_mode: mode,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteFlag(id: string): Promise<void> {
  const { error } = await sb.rpc('admin_delete_feature_flag', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function setFlagStore(flagId: string, storeId: string, enabled: boolean): Promise<void> {
  const { error } = await sb.rpc('admin_set_flag_store', { p_flag_id: flagId, p_store_id: storeId, p_enabled: enabled });
  if (error) throw new Error(error.message);
}