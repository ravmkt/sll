import { supabase } from '@/lib/supabase';

export type StoreStatus = 'active' | 'trial' | 'past_due' | 'inactive';

export type AdminStoreRow = {
  id: string;
  name: string | null;
  url: string | null;
  platform: string | null;
  contact_email: string | null;
  whatsapp: string | null;
  owner_email: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  storage_used_bytes: number | null;
  storage_limit_bytes: number | null;
  status: StoreStatus;
  plans: string[];
};

export type AdminStoreDetail = {
  store: AdminStoreRow & { trial_ends_at: string | null; past_due_since: string | null };
  subscriptions: {
    id: string; status: string; module_key: string | null; plan_name: string | null;
    billing_cycle: string | null; is_current: boolean; created_at: string;
  }[];
  invoices: {
    id: string; amount_cents: number; status: string; due_date: string | null;
    paid_at: string | null; description: string | null;
  }[];
  paid_cents: number;
  open_cents: number;
  events_30d: Record<string, number>;
  referrals: { count: number; total: number };
  audit: { action: string; details: Record<string, unknown> | null; created_at: string }[];
};

export async function listStores(): Promise<AdminStoreRow[]> {
  const { data, error } = await supabase.rpc('admin_list_stores');
  if (error) throw error;
  return (data || []) as AdminStoreRow[];
}

export async function getStoreDetail(storeId: string): Promise<AdminStoreDetail> {
  const { data, error } = await supabase.rpc('admin_store_detail', { p_store_id: storeId });
  if (error) throw error;
  return data as AdminStoreDetail;
}

export async function setSubscriptionStatus(subscriptionId: string, status: 'active' | 'canceled' | 'lifetime'): Promise<number> {
  const { data, error } = await supabase.rpc('admin_set_subscription_status', { p_subscription_id: subscriptionId, p_status: status });
  if (error) throw error;
  return (data as number) ?? 0;
}