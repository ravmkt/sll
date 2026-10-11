import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';
import { getActiveSubscriptions } from '@/services/subscriptions/getStoreSubscriptions';
import { getCatalogModules, type CatalogModule } from '@/services/plans/getCatalogShowcase';
import { AffiliateDatabaseService } from '@/services/AffiliateDatabaseService';

const sb: any = supabase;

export interface DashData {
  products: number;
  viewsMonth: number;
  clicksMonth: number;
  revenueMonth: number;
  viewsToday: number;
  activeVideos: number;
  totalVideos: number;
  ctrMonth: number;
  owned: string[];
  trialDays: Record<string, number>;
  catalog: CatalogModule[];
  referred: number;
}

const EMPTY: DashData = {
  products: 0, viewsMonth: 0, clicksMonth: 0, revenueMonth: 0, viewsToday: 0, activeVideos: 0, totalVideos: 0,
  ctrMonth: 0, owned: [], trialDays: {}, catalog: [], referred: 0,
};

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sum = (rows: any[], k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const val = (r: PromiseSettledResult<any>, d: any = null) => (r.status === 'fulfilled' ? r.value : d);

export function useDashboardData(storeId: string | null | undefined) {
  const [data, setData] = useState<DashData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    const now = new Date();
    const today = ymd(now);
    const m1 = ymd(new Date(now.getFullYear(), now.getMonth(), 1));

    (async () => {
      const [prod, month, day, overview, mods, subs, cat, aff] = await Promise.allSettled([
        sb.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('active', true),
        VidlyticsDatabaseService.getVideosPerformance(storeId, m1, today),
        VidlyticsDatabaseService.getVideosPerformance(storeId, today, today),
        VidlyticsDatabaseService.getOverviewMetrics(storeId, m1, today),
        sb.rpc('get_store_active_modules', { p_store_id: storeId }),
        getActiveSubscriptions(storeId),
        getCatalogModules(),
        AffiliateDatabaseService.getSummary(storeId),
      ]);

      const monthRows: any[] = val(month, []) || [];
      const dayRows: any[] = val(day, []) || [];
      const views = sum(monthRows, 'views');
      const clicks = sum(monthRows, 'clicks');
      const subsList: any[] = val(subs, []) || [];

      const trialDays: Record<string, number> = {};
      subsList.forEach((s) => {
        if (s.status !== 'trialing' || !s.module_key || s.module_key === 'bundle') return;
        const end = new Date(s.trial_ends_at ?? s.current_period_end ?? 0).getTime();
        const d = Math.ceil((end - Date.now()) / 86400000);
        if (d > 0) trialDays[s.module_key] = d;
      });

      const modsRes = val(mods, null);
      const owned: string[] = Array.isArray(modsRes?.data) ? modsRes.data : [];

      if (!alive) return;
      setData({
        products: val(prod, null)?.count ?? 0,
        viewsMonth: views,
        clicksMonth: clicks,
        revenueMonth: Number(val(overview, null)?.totalRevenue) || 0,
        viewsToday: sum(dayRows, 'views'),
        activeVideos: monthRows.filter((r) => r.status === 'active').length,
        totalVideos: monthRows.length,
        ctrMonth: views > 0 ? (clicks / views) * 100 : 0,
        owned,
        trialDays,
        catalog: val(cat, []) || [],
        referred: Number(val(aff, null)?.total_referred_stores) || 0,
      });
      setLoading(false);
    })();

    return () => { alive = false; };
  }, [storeId]);

  return { data, loading };
}