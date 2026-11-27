import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type SaleOrigin = 'balcao' | 'whatsapp' | 'live' | 'evento';
export const SALE_ORIGINS: { value: SaleOrigin; label: string }[] = [
  { value: 'balcao', label: 'Balcão' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'live', label: 'Live' },
  { value: 'evento', label: 'Evento' },
];

export interface SaleChannel { channel: string; label: string; warehouse_id: string | null }
export interface PhysicalChannel { channel: string; label: string; active: boolean; warehouse_id: string | null }

/** Lojas em que o usuario logado pode vender (a trava de vendedor ja vem aplicada). */
export async function mySaleChannels(storeId: string): Promise<SaleChannel[]> {
  const { data, error } = await sb.rpc('gestor_my_sale_channels', { p_store: storeId });
  if (error) throw new Error(error.message);
  const d: any = data;
  const arr: any[] = Array.isArray(d) ? d : Array.isArray(d?.channels) ? d.channels : [];
  return arr
    .map((x) => {
      if (typeof x === 'string') return { channel: x, label: x, warehouse_id: null };
      const ch = String(x?.channel ?? x?.key ?? '');
      return { channel: ch, label: String(x?.label ?? x?.name ?? ch), warehouse_id: (x?.warehouse_id ?? null) as string | null };
    })
    .filter((c) => c.channel);
}

/** Todas as lojas fisicas da loja (canais kind = physical). */
export async function listPhysicalChannels(storeId: string): Promise<PhysicalChannel[]> {
  const { data, error } = await sb
    .from('gestor_channels')
    .select('channel,label,active,warehouse_id')
    .eq('store_id', storeId)
    .eq('kind', 'physical')
    .order('label', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((r) => ({
    channel: String(r.channel),
    label: String(r.label || r.channel),
    active: r.active !== false,
    warehouse_id: (r.warehouse_id ?? null) as string | null,
  }));
}

/** Restricoes por vendedor: user_id -> lojas permitidas. Sem entrada = pode vender em todas. */
export async function sellerChannelsGet(storeId: string): Promise<Record<string, string[]>> {
  const { data, error } = await sb.rpc('gestor_seller_channels_get', { p_store: storeId });
  if (error) throw new Error(error.message);
  const out: Record<string, string[]> = {};
  const add = (u: unknown, c: unknown) => {
    if (typeof u !== 'string' || typeof c !== 'string' || !u || !c) return;
    if (!out[u]) out[u] = [];
    if (!out[u].includes(c)) out[u].push(c);
  };
  const d: any = data;
  if (Array.isArray(d)) {
    for (const r of d) {
      if (Array.isArray(r?.channels)) r.channels.forEach((c: unknown) => add(r.user_id, c));
      else add(r?.user_id, r?.channel);
    }
  } else if (d && typeof d === 'object') {
    for (const [u, v] of Object.entries(d)) {
      if (Array.isArray(v)) v.forEach((c: any) => add(u, typeof c === 'string' ? c : c?.channel));
    }
  }
  return out;
}

/** Lista vazia = sem restricao (vende em todas as lojas). */
export async function sellerChannelsSet(storeId: string, userId: string, channels: string[]): Promise<void> {
  const { error } = await sb.rpc('gestor_seller_channels_set', { p_store: storeId, p_user: userId, p_channels: channels });
  if (error) throw new Error(error.message);
}

export async function createPhysicalStore(
  storeId: string, name: string, inherit: string, warehouseId: string | null,
): Promise<Record<string, unknown>> {
  const { data, error } = await sb.rpc('gestor_physical_store_create', {
    p_store: storeId, p_name: name, p_inherit: inherit, p_warehouse: warehouseId,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function setOrderOrigin(orderId: string, origin: SaleOrigin): Promise<void> {
  const { error } = await sb.rpc('gestor_order_set_origin', { p_order: orderId, p_origin: origin });
  if (error) throw new Error(error.message);
}