import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface StudioStore {
  id: string;
  name: string | null;
  url: string | null;
  store_url: string | null;
  whatsapp: string | null;
  store_whatsapp: string | null;
}

export async function getMyStore(): Promise<StudioStore | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await sb
    .from('stores')
    .select('id,name,url,store_url,whatsapp,store_whatsapp')
    .eq('owner_user_id', auth.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as StudioStore | null;
}

export interface CampaignInput {
  name: string;
  ends_at: string | null;
  format: string;
  message_template: string;
  style: Record<string, unknown>;
}

export interface CampaignItemInput {
  product_id: string;
  original_price: number;
  discount_pct: number;
  promo_price: number;
}

export async function saveCampaign(storeId: string, c: CampaignInput, items: CampaignItemInput[]) {
  const { data, error } = await sb
    .from('promo_campaigns')
    .insert({ ...c, store_id: storeId, status: 'generated' })
    .select('id')
    .single();
  if (error) throw error;
  const rows = items.map((i) => ({ ...i, campaign_id: data.id, store_id: storeId }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await sb.from('promo_campaign_items').insert(rows.slice(i, i + 200));
    if (e) throw e;
  }
  return data.id as string;
}
