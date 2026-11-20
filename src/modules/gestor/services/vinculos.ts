import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface ChannelLink { product_id: string; channel: string; published: boolean }

export async function listChannelLinks(storeId: string): Promise<ChannelLink[]> {
  const out: ChannelLink[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .rpc('gestor_product_channels_list', { p_store: storeId })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of (data || []) as { product_id: string; channel: string; status: string }[]) {
      out.push({ product_id: r.product_id, channel: r.channel, published: r.status === 'published' });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function setChannelLink(storeId: string, productIds: string[], channel: string, link: boolean): Promise<number> {
  const { data, error } = await sb.rpc(
    link ? 'gestor_product_channel_link' : 'gestor_product_channel_unlink',
    { p_store: storeId, p_products: productIds, p_channel: channel },
  );
  if (error) throw new Error(error.message);
  return Number(data || 0);
}