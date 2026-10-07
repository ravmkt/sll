import { supabase as supabase } from '@/lib/supabase';

export type AdminStoreRow = {
  id: string;
  name: string;
  url: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  sub_status: string | null;
  plan_name: string | null;
  billing_cycle: string | null;
  period_end: string | null;
};

export type AdminXray = {
  store: AdminStoreRow & { owner_id: string | null };
  usage: {
    videos: number;
    storage_bytes: number;
    views_month: number;
    pages: number;
    last_event_at: string | null;
  };
  limits: Record<string, number | boolean | null> | null;
};

export const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Trial',
  past_due: 'Inadimplente',
  canceled: 'Cancelado',
  lifetime: 'Vitalício',
};

export const CYCLE_LABEL: Record<string, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const isSuperAdmin = () => call<boolean>('is_superadmin');

export const adminListStores = (search: string, status: string, limit: number, offset: number) =>
  call<{ total: number; rows: AdminStoreRow[] }>('admin_list_stores', {
    p_search: search || null,
    p_status: status || null,
    p_limit: limit,
    p_offset: offset,
  });

export const adminStoreXray = (storeId: string) =>
  call<AdminXray | null>('admin_store_xray', { p_store_id: storeId });

export function whatsappLink(phone: string | null, storeName: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length <= 11) digits = '55' + digits;
  const msg = `Olá! Aqui é o Rodrigo, do Sistema Loja Lucrativa. Vi que a loja ${storeName} usa o Vidlytics e queria ajudar você a vender mais com os vídeos.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}