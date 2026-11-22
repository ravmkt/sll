import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type CustomerTag = { tag: string; customers: number };

export async function listCustomerTags(storeId: string): Promise<CustomerTag[]> {
  const { data, error } = await sb.rpc('gestor_customer_tags', { p_store: storeId });
  if (error) throw new Error(error.message);
  return (data || []) as CustomerTag[];
}

export async function setCustomerTags(customerId: string, tags: string[]): Promise<void> {
  const { error } = await sb.from('customers').update({ tags, updated_at: new Date().toISOString() }).eq('id', customerId);
  if (error) throw new Error(error.message);
}

export async function applyTagsByPurchase(storeId: string): Promise<number> {
  const { data, error } = await sb.rpc('gestor_customer_tags_apply', { p_store: storeId });
  if (error) throw new Error(error.message);
  return Number(data || 0);
}