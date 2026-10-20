import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type RevSeriesRow = { bucket: string; item_key: string; item_label: string; is_combo: boolean; cents: number };
export type RevItem = { item_key: string; item_label: string; is_combo: boolean; cents: number };
export type ModulesRevenue = {
  group: 'day' | 'month';
  from: string;
  to: string;
  revenue_modules: number;
  revenue_combos: number;
  revenue_total: number;
  paying_stores: number;
  series: RevSeriesRow[];
  items: RevItem[];
};
export type StoreOpt = { id: string; name: string };

export const brlCents = (c: number) => ((Number(c) || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function getModulesRevenue(days: number, store: string | null): Promise<ModulesRevenue> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const { data, error } = await sb.rpc('admin_modules_revenue', { p_from: ymd(from), p_to: ymd(to), p_store: store });
  if (error) throw new Error(error.message);
  return data as ModulesRevenue;
}

export async function listStoreOptions(): Promise<StoreOpt[]> {
  const { data, error } = await sb.from('stores').select('id,name').order('name');
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((s) => ({ id: s.id as string, name: (s.name as string) || s.id }));
}