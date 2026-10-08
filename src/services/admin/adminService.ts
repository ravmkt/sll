import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type SeriesPoint = { d: string; v: number };

export interface DashboardData {
  stores: { total: number; active: number; inactive: number; past_due: number; trial: number; referred_active: number };
  past_due_total: number;
  forecast: number;
  revenue: number;
  granularity: 'day' | 'month';
  revenue_series: SeriesPoint[];
  views_series: SeriesPoint[];
  consumption: { views: number; events: number; storage_bytes: number };
  top_stores: { id: string; name: string; views: number }[];
}

export async function getDashboard(start: string, end: string, module: string | null): Promise<DashboardData> {
  const { data, error } = await sb.rpc('admin_dashboard_metrics', { p_start: start, p_end: end, p_module: module });
  if (error) throw error;
  return data as DashboardData;
}

export async function listModules(): Promise<{ slug: string; name: string }[]> {
  const { data, error } = await sb.from('hub_modules').select('slug,name').order('sort_order');
  if (error) throw error;
  return data || [];
}