import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type AppModuleKey = 'vidlytics' | 'live_commerce';

export async function getModuleAppEnabled(storeId: string, moduleKey: AppModuleKey): Promise<boolean> {
  const { data, error } = await sb.rpc('get_module_app_enabled', { p_store_id: storeId, p_module: moduleKey });
  if (error) return true;
  return data !== false;
}

export async function setModuleAppEnabled(storeId: string, moduleKey: AppModuleKey, enabled: boolean): Promise<boolean> {
  const patch =
    moduleKey === 'live_commerce'
      ? { live_app_enabled: enabled }
      : enabled
        ? { app_enabled: true, widget_enabled: true }
        : { app_enabled: false };
  const { data, error } = await sb.from('store_settings').update(patch).eq('store_id', storeId).select('store_id');
  if (error || !data || data.length === 0) return false;
  if (moduleKey === 'vidlytics') {
    window.dispatchEvent(new CustomEvent('vidlytics:app-enabled', { detail: enabled }));
  }
  return true;
}