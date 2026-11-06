import { supabase } from '@/lib/supabase';

export interface ActiveItem {
  id: string;
  kind: 'banner' | 'popup' | 'notice' | 'push';
  slide?: number;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  coupon_code: string | null;
  frequency: 'once' | 'session' | 'daily' | 'always';
  notice_style?: 'info' | 'warning' | 'urgent' | null;
  banner_format?: 'horizontal' | 'vertical' | null;
}

export async function fetchActive(storeId: string, location: 'home' | 'vidlytics' | 'live'): Promise<ActiveItem[]> {
  const { data, error } = await supabase.rpc('marketing_active_for_me', { p_store_id: storeId, p_location: location });
  if (error) return [];
  return (data || []) as ActiveItem[];
}

export async function track(itemId: string, storeId: string, type: 'impression' | 'click' | 'close'): Promise<void> {
  await supabase.rpc('marketing_track', { p_item_id: itemId, p_store_id: storeId, p_type: type });
}
export async function fetchPush(storeId: string, app: 'hub' | 'vidlytics' | 'live'): Promise<ActiveItem | null> {
  const { data, error } = await supabase.rpc('marketing_push_for_me', { p_store_id: storeId, p_app: app });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row && row.id ? row : null) as ActiveItem | null;
}
