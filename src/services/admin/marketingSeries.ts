import { supabase } from '@/lib/supabase';
import type { MktKind } from '@/services/admin/marketingAdmin';

export interface MktDay { day: string; impressions: number; clicks: number; closes: number }
export interface MktSeries { daily: MktDay[]; stores: number }

const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function getMarketingSeries(kind: MktKind, days: number): Promise<MktSeries> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const { data, error } = await supabase.rpc('admin_marketing_series', { p_start: ymd(start), p_end: ymd(end), p_kind: kind });
  if (error) throw error;
  const d = (data || {}) as Partial<MktSeries>;
  return {
    stores: Number(d.stores) || 0,
    daily: (d.daily || []).map((x) => ({
      day: String(x.day),
      impressions: Number(x.impressions) || 0,
      clicks: Number(x.clicks) || 0,
      closes: Number(x.closes) || 0,
    })),
  };
}