import { supabase } from '@/lib/supabase';

export const PAGE_SIZE = 25;

export type SortKey = 'total_spent' | 'last_order_at' | 'created_at' | 'name';

export type CustomerRow = {
  customer_id: string; name: string; email: string | null; phone: string | null; document: string | null;
  city: string | null; state: string | null; tags: string[]; accepts_marketing: boolean; accepts_whatsapp: boolean;
  orders_count: number; orders_all: number; total_spent: number; avg_ticket: number;
  first_order_at: string | null; last_order_at: string | null; days_since_last: number | null; first_channel: string | null;
};

export type CustomerFull = {
  id: string; name: string; email: string | null; phone: string | null; document: string | null; birth_date: string | null;
  zip: string | null; street: string | null; number: string | null; complement: string | null; district: string | null;
  city: string | null; state: string | null; tags: string[]; notes: string | null; source_platform: string | null;
  accepts_marketing: boolean; accepts_whatsapp: boolean;
};

export type CustomerProduct = { product_id: string | null; sku: string | null; name: string; qty: number; total: number; orders_count: number; last_purchase_at: string };
export type CustomerOrder = { id: string; number: string | number | null; created_at: string; status: string | null; payment_status: string | null; total: number; canceled_at: string | null; channel: string | null };

export const brl = (v: number | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('pt-BR') : '-');

export function maskDoc(doc: string | null | undefined): string {
  const d = (doc ?? '').replace(/\D/g, '');
  if (d.length === 11) return '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**';
  if (d.length === 14) return '**.***.' + d.slice(5, 8) + '/****-' + d.slice(12);
  return d ? '***' : '-';
}

export async function listCustomers(p: { storeId: string; search: string; tag: string; sort: SortKey; page: number }) {
  let q = supabase.from('customer_stats').select('*', { count: 'exact' }).eq('store_id', p.storeId);
  const term = p.search.trim().replace(/[,()%]/g, ' ');
  if (term) {
    q = q.or('name.ilike.%' + term + '%,email.ilike.%' + term + '%,phone.ilike.%' + term + '%,document.ilike.%' + term + '%');
  }
  if (p.tag.trim()) q = q.contains('tags', [p.tag.trim()]);
  q = p.sort === 'name'
    ? q.order('name', { ascending: true })
    : q.order(p.sort, { ascending: false, nullsFirst: false });
  const from = p.page * PAGE_SIZE;
  const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as CustomerRow[], total: count ?? 0 };
}

export async function getCustomer(id: string) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return data as CustomerFull;
}

export async function getCustomerProducts(id: string) {
  const { data, error } = await supabase.from('customer_products').select('*').eq('customer_id', id).order('total', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerProduct[];
}

export async function getCustomerOrders(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, number, created_at, status, payment_status, total, canceled_at, channel')
    .eq('customer_id', id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerOrder[];
}

export async function saveCustomer(storeId: string, id: string | null, f: Omit<CustomerFull, 'id' | 'source_platform'>, prev?: CustomerFull | null) {
  const now = new Date().toISOString();
  const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
  const payload = {
    name: f.name.trim(),
    email: clean(f.email) ? clean(f.email)!.toLowerCase() : null,
    phone: clean(f.phone), document: clean(f.document), birth_date: f.birth_date || null,
    zip: clean(f.zip), street: clean(f.street), number: clean(f.number), complement: clean(f.complement),
    district: clean(f.district), city: clean(f.city), state: f.state ? f.state.trim().toUpperCase() : null,
    tags: f.tags, notes: clean(f.notes),
    accepts_marketing: f.accepts_marketing,
    accepts_marketing_at: f.accepts_marketing !== (prev?.accepts_marketing ?? false) ? now : undefined,
    accepts_whatsapp: f.accepts_whatsapp,
    accepts_whatsapp_at: f.accepts_whatsapp !== (prev?.accepts_whatsapp ?? false) ? now : undefined,
    updated_at: now,
  };
  const res = id
    ? await supabase.from('customers').update(payload).eq('id', id)
    : await supabase.from('customers').insert({ ...payload, store_id: storeId, source_platform: 'manual' });
  if (res.error) {
    if (res.error.code === '23505') throw new Error('Ja existe um cliente com este e-mail nesta loja.');
    throw res.error;
  }
}
