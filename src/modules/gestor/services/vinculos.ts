import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface ChannelLink { product_id: string; channel: string; published: boolean }

export async function listChannelLinks(storeId: string): Promise<ChannelLink[]> {
  const out: ChannelLink[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.rpc('gestor_channel_links', { p_store: storeId }).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data || []) as ChannelLink[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function setChannelLink(storeId: string, productIds: string[], channel: string, link: boolean): Promise<number> {
  const { data, error } = await sb.rpc('gestor_channel_link', {
    p_store: storeId, p_products: productIds, p_channel: channel, p_link: link,
  });
  if (error) throw new Error(error.message);
  return Number(data || 0);
}