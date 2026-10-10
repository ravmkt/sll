import { supabase } from '@/lib/supabase';

export type ModuleKey = 'vidlytics' | 'live_commerce';
export type ModuleState = 'off' | 'manual' | 'paid' | 'plan';

export interface StoreModule {
  module_key: ModuleKey;
  state: ModuleState;
  status: string | null;
  ends_at: string | null;
}

export interface ModuleAccessResult {
  success: boolean;
  result: 'enabled' | 'disabled' | 'noop';
  message?: string;
}

export async function getStoreModules(storeId: string): Promise<StoreModule[]> {
  const { data, error } = await (supabase as any).rpc('admin_get_store_modules', { p_store_id: storeId });
  if (error) throw new Error(error.message);
  return (data ?? []) as StoreModule[];
}

export async function setModuleAccess(
  storeId: string,
  moduleKey: ModuleKey,
  enabled: boolean,
  days: number | null = null,
  asTrial = false,
): Promise<ModuleAccessResult> {
  const { data, error } = await (supabase as any).rpc('admin_set_module_access', {
    p_store_id: storeId,
    p_module_key: moduleKey,
    p_enabled: enabled,
    p_days: days,
    p_as_trial: asTrial,
  });
  if (error) throw new Error(error.message);
  return data as ModuleAccessResult;
}