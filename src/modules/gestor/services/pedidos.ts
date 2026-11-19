import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type Row = Record<string, any>;
export const PAGE_SIZE = 25;

export interface OrderFilters {
  search: string;
  payment: string;
  fulfillment: string;
  channel: string;
  page: number;
}

export interface OrderDetail {
  order: Row;
  customer: Row | null;
  items: Row[];
}

export interface RestockedItem {
  variant_id: string;
  sku: string;
  balance: number;
}

export const FULFILLMENT_LABEL: Record<string, string> = {
  pending: 'Pendente',
  separating: 'Em separação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
};

export const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Pago',
  approved: 'Pago',
  pending: 'Pendente',
  waiting_payment: 'Aguardando pagamento',
  refused: 'Recusado',
  refunded: 'Reembolsado',
  canceled: 'Cancelado',
  cancelled: 'Cancelado',
};

export const brl = (n: number | string | null | undefined) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('pt-BR') : '-';

export function pick(o: Row | null | undefined, ...keys: string[]): any {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return null;
}

export function customerName(order: Row, customer: Row | null | undefined): string {
  const c = customer || null;
  const full = [pick(c, 'first_name'), pick(c, 'last_name')].filter(Boolean).join(' ');
  return (
    pick(c, 'name', 'full_name') ||
    full ||
    pick(order, 'customer_name', 'buyer_name') ||
    pick(c, 'email') ||
    pick(order, 'customer_email', 'email') ||
    '-'
  );
}

export function fulfillmentOf(o: Row): string {
  if (o.canceled_at) return 'canceled';
  return o.fulfillment_status || 'pending';
}

export async function listOrders(storeId: string, f: OrderFilters): Promise<{ total: number; rows: Row[] }> {
  const { data, error } = await sb.rpc('gestor_orders_list', {
    p_store: storeId,
    p_search: f.search.trim() || null,
    p_payment: f.payment || null,
    p_fulfillment: f.fulfillment || null,
    p_channel: f.channel || null,
    p_limit: PAGE_SIZE,
    p_offset: f.page * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data as { total: number; rows: Row[] };
}

export async function orderFacets(storeId: string): Promise<{ payment: string[]; channel: string[] }> {
  const { data, error } = await sb.rpc('gestor_orders_facets', { p_store: storeId });
  if (error) throw new Error(error.message);
  return data as { payment: string[]; channel: string[] };
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { data, error } = await sb.rpc('gestor_order_detail', { p_order: id });
  if (error) throw new Error(error.message);
  return data as OrderDetail;
}

export async function setFulfillment(
  id: string,
  status: string,
  tracking: string,
  trackingUrl: string,
  note: string,
): Promise<void> {
  const { error } = await sb.rpc('gestor_order_set_fulfillment', {
    p_order: id,
    p_status: status,
    p_tracking: tracking || null,
    p_tracking_url: trackingUrl || null,
    p_note: note,
  });
  if (error) throw new Error(error.message);
}

export async function cancelOrder(id: string, restock: boolean, reason: string): Promise<RestockedItem[]> {
  const { data, error } = await sb.rpc('gestor_order_cancel', {
    p_order: id,
    p_restock: restock,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
  return (data || []) as RestockedItem[];
}