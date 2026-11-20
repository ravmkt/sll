import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type ChannelKey = 'yampi' | 'mercado_livre' | 'tiktok' | 'instagram';
export type LinkStatus = 'pending' | 'published';
export interface ProductLink { channel: ChannelKey; status: LinkStatus }

export const CHANNEL_META: Record<ChannelKey, { label: string; color: string; letter: string }> = {
  yampi: { label: 'Yampi', color: '#7c3aed', letter: 'Y' },
  mercado_livre: { label: 'Mercado Livre', color: '#f5c400', letter: 'M' },
  tiktok: { label: 'TikTok Shopping', color: '#111827', letter: 'T' },
  instagram: { label: 'Instagram', color: '#e1306c', letter: 'I' },
};

const isKey = (k: unknown): k is ChannelKey => typeof k === 'string' && k in CHANNEL_META;

/** Canais que o lojista configurou e deixou ativos em "Canais e depositos". */
export async function listActiveChannels(storeId: string): Promise<ChannelKey[]> {
  const { data, error } = await sb.rpc('gestor_channels_list', { p_store: storeId });
  if (error) throw error;
  const out: ChannelKey[] = [];
  for (const r of (data || []) as Record<string, unknown>[]) {
    const key = r.channel ?? r.key;
    const on = r.enabled ?? r.active ?? r.is_active;
    if (isKey(key) && on !== false && !out.includes(key)) out.push(key);
  }
  return out;
}

/** Mapa produto -> canais vinculados. */
export async function listProductChannels(storeId: string): Promise<Map<string, ProductLink[]>> {
  const map = new Map<string, ProductLink[]>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .rpc('gestor_product_channels_list', { p_store: storeId })
      .range(from, from + 999);
    if (error) throw error;
    for (const r of (data || []) as { product_id: string; channel: string; status: LinkStatus }[]) {
      if (!isKey(r.channel)) continue;
      const list = map.get(r.product_id) ?? [];
      list.push({ channel: r.channel, status: r.status });
      map.set(r.product_id, list);
    }
    if (!data || data.length < 1000) break;
  }
  return map;
}

export async function linkProducts(storeId: string, productIds: string[], channel: ChannelKey): Promise<number> {
  const { data, error } = await sb.rpc('gestor_product_channel_link', {
    p_store: storeId, p_products: productIds, p_channel: channel,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function unlinkProducts(storeId: string, productIds: string[], channel: ChannelKey): Promise<number> {
  const { data, error } = await sb.rpc('gestor_product_channel_unlink', {
    p_store: storeId, p_products: productIds, p_channel: channel,
  });
  if (error) throw error;
  return Number(data ?? 0);
}
