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
  status: StoreStatus;
  plans: string[];
  modules: string[];
  referrals_made: number;
  is_lifetime: boolean;
  subs: { id: string; status: string }[];
};

export type AdminSub = {
  id: string;
  status: string;
  module_key: string | null;
  plan_name: string | null;
  billing_cycle: string | null;
  is_current: boolean;
  created_at: string;
  has_asaas: boolean;
};

export type AdminStoreFull = {
  store: {
    id: string;
    name: string | null;
    url: string | null;
    platform: string | null;
    contact_name: string | null;
    contact_email: string | null;
    owner_contact_email: string | null;
    whatsapp: string | null;
    owner_email: string | null;
    last_sign_in_at: string | null;
    created_at: string;
    storage_used_bytes: number | null;
    storage_limit_bytes: number | null;
    trial_ends_at: string | null;
    past_due_since: string | null;
    referred_by_name: string | null;
  };
  subscriptions: AdminSub[];
  invoices: {
    id: string;
    amount_cents: number;
    status: string;
    due_date: string | null;
    paid_at: string | null;
    description: string | null;
    created_at: string;
  }[];
  paid_cents: number;
  open_cents: number;
  paid_count: number;
  events_30d: Record<string, number>;
  events_total: Record<string, number>;
  videos_count: number;
  last_event_at: string | null;
  referrals: {
    made_count: number;
    commission_total: number;
    list: { id: string; name: string | null; created_at: string }[];
  };
  benefits: { id: string; kind: string; value: string; note: string | null; created_at: string }[];
  audit: { action: string; details: Record<string, unknown> | null; created_at: string }[];
  recent_events: { event_type: string; created_at: string; page_path: string | null }[];
};

export type PlanOption = { id: string; name: string | null; module_key: string | null };

const client = supabase as any;

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export async function listStores(): Promise<AdminStoreRow[]> {
  return (await call<AdminStoreRow[]>('admin_master_stores_overview')) || [];
}

export function getStoreFull(storeId: string): Promise<AdminStoreFull> {
  return call<AdminStoreFull>('admin_master_store_full', { p_store_id: storeId });
}

export async function listPlans(): Promise<PlanOption[]> {
  return (await call<PlanOption[]>('admin_master_list_plans')) || [];
}

export async function setSubscriptionStatus(subscriptionId: string, status: 'active' | 'canceled' | 'lifetime'): Promise<number> {
  return (await call<number>('admin_set_subscription_status', { p_subscription_id: subscriptionId, p_status: status })) ?? 0;
}

export async function changePlan(subscriptionId: string, planId: string): Promise<number> {
  return (await call<number>('admin_master_change_plan', { p_subscription_id: subscriptionId, p_plan_id: planId })) ?? 0;
}

export async function updateStore(storeId: string, data: Record<string, string>): Promise<void> {
  await call<null>('admin_master_store_update', { p_store_id: storeId, p_data: data });
}

export async function deleteStore(storeId: string): Promise<void> {
  await call<null>('admin_master_store_delete', { p_store_id: storeId });
}

export async function addBenefit(storeId: string, kind: string, value: string, note: string): Promise<void> {
  await call<null>('admin_master_add_benefit', { p_store_id: storeId, p_kind: kind, p_value: value, p_note: note });
}