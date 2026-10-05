import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type SyncResult = {
  products: number; variants_updated: number; variants_added: number;
  prices_updated: number; not_found: number; failed: number;
};
export type SyncInfo = { last_sync_at: string | null; webhook_status: string | null };

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.functions.invoke('yampi-sync', { body });
  if (error) {
    let m = error.message as string;
    try { const j = await error.context.json(); if (j?.error) m = j.error; } catch { /* sem corpo */ }
    throw new Error(m);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const syncYampi = (storeId: string, productId?: string) => call<SyncResult>({ action: 'sync', store_id: storeId, product_id: productId });
export const registerYampiWebhook = (storeId: string) => call<{ status: string }>({ action: 'register_webhook', store_id: storeId });
export const getYampiSyncInfo = (storeId: string) => call<SyncInfo>({ action: 'info', store_id: storeId });