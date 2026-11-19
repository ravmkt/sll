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
  channels?: string[];
  template_key?: string;
  art_mode?: string;
  source_campaign_id?: string | null;
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

export interface CampaignRow {
  id: string;
  name: string;
  ends_at: string | null;
  format: string;
  channels: string[];
  template_key: string;
  art_mode: string;
  status: string;
  message_template: string;
  style: Record<string, unknown>;
  created_at: string;
  items_count: number;
}

export async function listCampaigns(storeId: string): Promise<CampaignRow[]> {
  const { data, error } = await sb
    .from('promo_campaigns')
    .select('id,name,ends_at,format,channels,template_key,art_mode,status,message_template,style,created_at,promo_campaign_items(count)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    channels: Array.isArray(r.channels) ? r.channels : [],
    items_count: r.promo_campaign_items?.[0]?.count ?? 0,
  })) as CampaignRow[];
}

export async function getCampaignItems(campaignId: string): Promise<CampaignItemInput[]> {
  const { data, error } = await sb
    .from('promo_campaign_items')
    .select('product_id,original_price,discount_pct,promo_price')
    .eq('campaign_id', campaignId);
  if (error) throw error;
  return (data ?? []) as CampaignItemInput[];
}

export async function updateCampaign(campaignId: string, storeId: string, c: CampaignInput, items: CampaignItemInput[]) {
  const { error } = await sb
    .from('promo_campaigns')
    .update({ ...c, status: 'generated', updated_at: new Date().toISOString() })
    .eq('id', campaignId);
  if (error) throw error;
  const { error: d } = await sb.from('promo_campaign_items').delete().eq('campaign_id', campaignId);
  if (d) throw d;
  const rows = items.map((i) => ({ ...i, campaign_id: campaignId, store_id: storeId }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await sb.from('promo_campaign_items').insert(rows.slice(i, i + 200));
    if (e) throw e;
  }
  return campaignId;
}

export async function deleteCampaign(campaignId: string) {
  const { error } = await sb.from('promo_campaigns').delete().eq('id', campaignId);
  if (error) throw error;
}
export async function patchCampaignStyle(campaignId: string, patch: Record<string, unknown>) {
  const { data, error } = await sb.from('promo_campaigns').select('style').eq('id', campaignId).single();
  if (error) throw error;
  const { error: e } = await sb
    .from('promo_campaigns')
    .update({ style: { ...((data?.style as Record<string, unknown>) ?? {}), ...patch }, updated_at: new Date().toISOString() })
    .eq('id', campaignId);
  if (e) throw e;
}