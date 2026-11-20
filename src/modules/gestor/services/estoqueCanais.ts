import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export const CHANNEL_META: Record<string, { label: string; short: string }> = {
  yampi: { label: 'E-commerce (Yampi)', short: 'Yampi' },
  mercadolivre: { label: 'Mercado Livre', short: 'ML' },
  tiktok: { label: 'TikTok Shop', short: 'TikTok' },
};

export interface ChannelRule {
  channel: string;
  ceiling: number | null;
  reserve: number;
  active: boolean;
  warehouse_ids: string[] | null;
}

export interface AvailCell { physical: number; available: number }
export interface Availability {
  byVariant: Map<string, { total: number; ch: Record<string, AvailCell> }>;
  channels: string[];
}
export const EMPTY_AVAIL: Availability = { byVariant: new Map(), channels: [] };

export interface VariantWhStock { warehouse_id: string; name: string; is_ecommerce: boolean; qty: number }

export async function listChannelRules(storeId: string): Promise<ChannelRule[]> {
  const { data, error } = await sb.rpc('gestor_channels_list', { p_store: storeId });
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((r) => ({
    channel: r.channel,
    ceiling: r.ceiling == null ? null : Number(r.ceiling),
    reserve: Number(r.reserve),
    active: !!r.active,
    warehouse_ids: r.warehouse_ids ?? null,
  }));
}

export async function saveChannelRule(storeId: string, r: ChannelRule): Promise<void> {
  const { error } = await sb.rpc('gestor_channel_save', {
    p_store: storeId,
    p_channel: r.channel,
    p_ceiling: r.ceiling,
    p_reserve: r.reserve,
    p_active: r.active,
    p_warehouses: r.warehouse_ids,
  });
  if (error) throw new Error(error.message);
}

export async function loadAvailability(storeId: string): Promise<Availability> {
  const byVariant: Availability['byVariant'] = new Map();
  const channels = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.rpc('gestor_availability', { p_store: storeId }).range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of (data || []) as any[]) {
      const cur = byVariant.get(r.variant_id) ?? { total: 0, ch: {} };
      if (r.channel === '_all') cur.total = Number(r.physical);
      else { cur.ch[r.channel] = { physical: Number(r.physical), available: Number(r.available) }; channels.add(r.channel); }
      byVariant.set(r.variant_id, cur);
    }
    if (!data || data.length < 1000) break;
  }
  const order = Object.keys(CHANNEL_META);
  return { byVariant, channels: [...channels].sort((a, b) => order.indexOf(a) - order.indexOf(b)) };
}

export async function variantWarehouseStock(variantId: string): Promise<VariantWhStock[]> {
  const { data, error } = await sb.rpc('gestor_variant_stock', { p_variant: variantId });
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((r) => ({ ...r, qty: Number(r.qty) }));
}

export async function transferStock(variantId: string, from: string, to: string, qty: number, note: string): Promise<void> {
  const { error } = await sb.rpc('gestor_stock_transfer', {
    p_variant: variantId, p_from: from, p_to: to, p_qty: qty, p_note: note || null,
  });
  if (error) throw new Error(error.message);
}