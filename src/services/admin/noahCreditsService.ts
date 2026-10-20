import { supabase } from '@/lib/supabase';

export type NoahCredits = {
  store_id: string;
  credits_used: number;
  credits_total: number;
  credits_extra: number;
  renewal_date: string | null;
};

export async function getNoahCredits(storeId?: string): Promise<NoahCredits[]> {
  const { data, error } = await (supabase as any).rpc('admin_noah_credits', { p_store_id: storeId ?? null });
  if (error) throw error;
  return (data || []) as NoahCredits[];
}