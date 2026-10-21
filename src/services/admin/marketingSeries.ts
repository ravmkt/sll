import { supabase } from '@/lib/supabase';
import type { MktKind } from '@/services/admin/marketingAdmin';
import { toRange, type DateRange } from '@/services/admin/marketingPeriod';

export interface MktDay { day: string; impressions: number; clicks: number; closes: number }
export interface MktSeries { daily: MktDay[]; stores: number }

export async function getMarketingSeries(kind: MktKind, arg: number | DateRange): Promise<MktSeries> {
  const r = toRange(arg);
  const { data, error } = await supabase.rpc('admin_marketing_series', { p_start: r.start, p_end: r.end, p_kind: kind });
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