import { supabase } from '@/lib/supabase';

export type Consumption = {
  measured: boolean;
  events: Record<string, number>;
  videos_total: number;
  videos_new: number;
  videos_bytes: number;
  storage_total: number;
  top_storage: { id: string; name: string | null; used: number; limit: number | null }[];
};

export async function getConsumption(start: string, end: string, module: string | null): Promise<Consumption> {
  const { data, error } = await (supabase as any).rpc('admin_master_consumption', {
    p_start: start,
    p_end: end,
    p_module: module,
  });
  if (error) throw error;
  return data as Consumption;
}