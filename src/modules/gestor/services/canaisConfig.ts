import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface ChannelRow { channel: string; active: boolean; warehouse_id: string | null; inherit_from: string | null }
export interface StatusRow { external_status: string; gestor_status: string; payment_status: string; returns_stock: boolean }
export interface WarehouseOpt { id: string; name: string; is_ecommerce?: boolean }
export interface ChannelsConfig {
  can_edit: boolean;
  channels: ChannelRow[];
  status_map: (StatusRow & { channel: string })[];
  warehouses: WarehouseOpt[];
}

export const CHANNEL_LABEL: Record<string, string> = {
  yampi: 'Yampi',
  pdv: 'PDV (loja física)',
  nuvemshop: 'Nuvemshop',
  mercadolivre: 'Mercado Livre',
  tiktok: 'TikTok Shop',
  shopee: 'Shopee',
  amazon: 'Amazon',
};
export const KNOWN_CHANNELS = Object.keys(CHANNEL_LABEL);
export const channelName = (c: string) => CHANNEL_LABEL[c] ?? c;

export const GESTOR_STATUS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'processing', label: 'Em separação' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'canceled', label: 'Cancelado' },
  { value: 'returned', label: 'Devolvido' },
];
export const PAYMENT_STATUS: { value: string; label: string }[] = [
  { value: '', label: 'Não altera' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'refunded', label: 'Reembolsado' },
  { value: 'failed', label: 'Falhou' },
];

export async function getChannelsConfig(storeId: string): Promise<ChannelsConfig> {
  const { data, error } = await sb.rpc('gestor_channels_get', { p_store: storeId });
  if (error) throw new Error(error.message);
  const d: any = data || {};
  return {
    can_edit: !!d.can_edit,
    channels: ((d.channels || []) as any[]).map((c) => ({
      channel: c.channel, active: !!c.active, warehouse_id: c.warehouse_id ?? null, inherit_from: c.inherit_from ?? null,
    })),
    status_map: ((d.status_map || []) as any[]).map((m) => ({
      channel: m.channel, external_status: m.external_status, gestor_status: m.gestor_status,
      payment_status: m.payment_status ?? '', returns_stock: !!m.returns_stock,
    })),
    warehouses: ((d.warehouses || []) as any[]).map((w) => ({ id: w.id, name: w.name, is_ecommerce: !!w.is_ecommerce })),
  };
}

export async function saveChannel(storeId: string, channel: string, active: boolean, warehouseId: string | null): Promise<void> {
  const { error } = await sb.rpc('gestor_channel_save', {
    p_store: storeId, p_channel: channel, p_active: active, p_warehouse: warehouseId,
  });
  if (error) throw new Error(error.message);
}

export async function setChannelInherit(storeId: string, channel: string, from: string | null): Promise<void> {
  const { error } = await sb.rpc('gestor_channel_set_inherit', { p_store: storeId, p_channel: channel, p_from: from });
  if (error) throw new Error(error.message);
}

export async function saveStatusMap(storeId: string, channel: string, rows: StatusRow[]): Promise<void> {
  const { error } = await sb.rpc('gestor_channel_status_save', {
    p_store: storeId, p_channel: channel,
    p_rows: rows.map((r) => ({
      external_status: r.external_status.trim(), gestor_status: r.gestor_status,
      payment_status: r.payment_status || null, returns_stock: r.returns_stock,
    })),
  });
  if (error) throw new Error(error.message);
}