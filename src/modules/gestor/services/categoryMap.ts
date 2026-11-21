import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface ChannelCategory {
  channel: string;
  external_name: string;
  products: number;
  category_id: string | null;
  category_name: string | null;
}

export const CHANNEL_LABEL: Record<string, string> = {
  yampi: 'Yampi',
  nuvemshop: 'Nuvemshop',
  mercadolivre: 'Mercado Livre',
  tiktok: 'TikTok Shop',
};

export const channelLabel = (c: string) => CHANNEL_LABEL[c] ?? c.charAt(0).toUpperCase() + c.slice(1);

export async function listChannelCategories(storeId: string): Promise<ChannelCategory[]> {
  const { data, error } = await sb.rpc('gestor_category_channels', { p_store: storeId });
  if (error) throw new Error(error.message);
  return (data || []) as ChannelCategory[];
}

export async function saveCategoryMap(storeId: string, channel: string, external: string, categoryId: string | null): Promise<number> {
  const { data, error } = await sb.rpc('gestor_category_map_save', {
    p_store: storeId, p_channel: channel, p_external: external, p_category: categoryId,
  });
  if (error) throw new Error(error.message);
  return Number(data || 0);
}

export async function autoMapChannel(storeId: string, channel: string): Promise<number> {
  const { data, error } = await sb.rpc('gestor_category_map_auto', { p_store: storeId, p_channel: channel });
  if (error) throw new Error(error.message);
  return Number(data || 0);
}
export async function saveCategory(storeId: string, name: string, parentId: string | null): Promise<string> {
  const { data, error } = await sb.rpc('gestor_category_save', {
    p_store: storeId, p_name: name, p_id: null, p_parent: parentId, p_active: true,
  });
  if (error) throw new Error(error.message);
  return data as string;
}