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
  ai_interactions: number;
  ai_tokens: number;
  ai_cost_usd: number;
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

export type PlanOption = { id: string; name: string | null; module_key: string | null; is_combo?: boolean; is_active?: boolean };

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

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { data, error } = await client.functions.invoke('asaas-cancel-subscription', {
    body: { subscription_id: subscriptionId },
  });
  if (error) {
    let msg: string = error.message || 'Erro ao cancelar a assinatura.';
    try {
      const b = await error.context.json();
      msg = b?.details?.errors?.[0]?.description || b?.error || msg;
    } catch { /* mantém a mensagem padrão */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(String(data.error));
  // Registra a ação no log do painel (o cancelamento já foi feito acima)
  try { await setSubscriptionStatus(subscriptionId, 'canceled'); } catch { /* já cancelada */ }
}

export type StorePeriod = {
  events: Record<string, number>;
  events_source: string | null;
  invoices: AdminStoreFull['invoices'];
  paid_cents: number;
  paid_count: number;
};
export type ReferredStore = {
  id: string; name: string | null; created_at: string; plan_name: string | null; status: StoreStatus; commission: number;
};
export type StoreReferrals = { referred_by: { id: string; name: string | null } | null; list: ReferredStore[] };

export function getStorePeriod(storeId: string, days: number | null): Promise<StorePeriod> {
  return call<StorePeriod>('admin_master_store_period', { p_store_id: storeId, p_days: days });
}

export function getStoreReferrals(storeId: string): Promise<StoreReferrals> {
  return call<StoreReferrals>('admin_master_store_referrals', { p_store_id: storeId });
}

export function createSubscription(storeId: string, planId: string, moduleKey: string, cycle: string, status: string): Promise<string> {
  return call<string>('admin_master_create_subscription', {
    p_store_id: storeId, p_plan_id: planId, p_module_key: moduleKey, p_cycle: cycle, p_status: status,
  });
}

export async function sendMasterEmail(storeId: string, subject: string, message: string, to?: string): Promise<{ to: string }> {
  const { data, error } = await client.functions.invoke('send-master-email', {
    body: { store_id: storeId, subject, message, to: to?.trim() || undefined },
  });
  if (error) {
    let msg: string = error.message || 'Erro ao enviar o e-mail.';
    try { const b = await error.context.json(); msg = b?.error || msg; } catch { /* mantém a mensagem padrão */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as { to: string };
}