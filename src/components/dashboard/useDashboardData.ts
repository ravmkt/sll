import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';
import { getActiveSubscriptions } from '@/services/subscriptions/getStoreSubscriptions';
import { AffiliateDatabaseService } from '@/services/AffiliateDatabaseService';

const sb: any = supabase;

export interface Range { start: string; end: string }

export interface ModuleRow {
  slug: string;
  name: string;
  logo_url: string | null;
  status: string;
  description: string | null;
  benefits: string[];
  route_path: string | null;
  sort_order: number;
}

export interface TopVideo { title: string; views: number; clicks: number; conversions: number }

export interface DashData {
  products: number;
  viewsRange: number;
  clicksRange: number;
  ctrRange: number;
  assistedRevenue: number;
  clubCommission: number;
  totalVideos: number;
  topVideo: TopVideo | null;
  owned: string[];
  trialDays: Record<string, number>;
  modules: ModuleRow[];
  waitlist: string[];
  trialUsed: string[];
  referred: number;
}

const EMPTY: DashData = {
  products: 0, viewsRange: 0, clicksRange: 0, ctrRange: 0, assistedRevenue: 0, clubCommission: 0,
  totalVideos: 0, topVideo: null, owned: [], trialDays: {}, modules: [], waitlist: [], trialUsed: [], referred: 0,
};

const sum = (rows: any[], k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const val = (r: PromiseSettledResult<any>, d: any = null) => (r.status === 'fulfilled' ? r.value : d);

async function loadModules(): Promise<ModuleRow[]> {
  const full = await sb.from('hub_modules')
    .select('slug,name,logo_url,status,description,benefits,route_path,sort_order').order('sort_order');
  let rows: any[] | null = full.error ? null : full.data;
  if (!rows) {
    const basic = await sb.from('hub_modules').select('slug,name,logo_url,status,sort_order').order('sort_order');
    rows = basic.error ? [] : basic.data;
  }
  return (rows || []).map((r: any): ModuleRow => ({
    slug: r.slug,
    name: r.name,
    logo_url: r.logo_url ?? null,
    status: r.status,
    description: r.description ?? null,
    benefits: Array.isArray(r.benefits) ? r.benefits.map(String) : [],
    route_path: r.route_path ?? null,
    sort_order: Number(r.sort_order) || 0,
  }));
}

async function applyStaging(storeId: string, list: ModuleRow[]): Promise<ModuleRow[]> {
  try {
    const { data, error } = await sb.rpc('staging_module_overrides', { p_store_id: storeId });
    if (error || !data) return list;
    return list.map((m) => {
      const o = (data as Record<string, any>)[m.slug];
      if (!o) return m;
      return {
        ...m,
        name: o.name ?? m.name,
        status: o.status ?? m.status,
        logo_url: o.logo_url !== undefined ? o.logo_url : m.logo_url,
        description: o.description ?? m.description,
        benefits: Array.isArray(o.features) ? o.features.map(String) : m.benefits,
      };
    });
  } catch {
    return list;
  }
}

const moduleRank = (status: string): number => {
  const s = String(status || '').toLowerCase();
  if (s === 'coming_soon') return 1;
  if (['hidden', 'inactive', 'paused', 'oculto'].includes(s)) return 2;
  return 0;
};

/** Disponiveis primeiro, depois "em breve", depois o resto; dentro de cada grupo vale a ordem do Master */
export function sortModules(list: ModuleRow[]): ModuleRow[] {
  return [...list].sort((a, b) => moduleRank(a.status) - moduleRank(b.status) || a.sort_order - b.sort_order);
}

export function useDashboardData(storeId: string | null | undefined, range: Range) {
  const [data, setData] = useState<DashData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId || !range.start || !range.end || range.start > range.end) return;
    let alive = true;
    setLoading(true);

    (async () => {
      const [prod, perf, overview, mods, subs, hub, aff, rew, wl] = await Promise.allSettled([
        sb.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('active', true),
        VidlyticsDatabaseService.getVideosPerformance(storeId, range.start, range.end),
        VidlyticsDatabaseService.getOverviewMetrics(storeId, range.start, range.end),
        sb.rpc('get_store_active_modules', { p_store_id: storeId }),
        getActiveSubscriptions(storeId),
        loadModules().then((l) => applyStaging(String(storeId), l)),
        AffiliateDatabaseService.getSummary(storeId),
        sb.from('referral_rewards').select('amount')
          .eq('referrer_store_id', storeId).neq('status', 'canceled')
          .gte('created_at', `${range.start}T00:00:00-03:00`)
          .lte('created_at', `${range.end}T23:59:59.999-03:00`)
          .limit(5000),
        sb.from('module_waitlist').select('module_slug').eq('store_id', storeId),
      ]);

      const rows: any[] = val(perf, []) || [];
      const views = sum(rows, 'views');
      const clicks = sum(rows, 'clicks');
      const best = rows.filter((r) => r.conversions > 0).sort((a, b) => b.conversions - a.conversions)[0];

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
      const rewRows: any[] = val(rew, null)?.data || [];
      const wlRows: any[] = val(wl, null)?.data || [];

      let trialUsed: string[] = [];
      try {
        const [reg, ss] = await Promise.all([
          sb.from('trial_registry').select('*').eq('store_id', storeId),
          sb.from('subscriptions').select('module_key').eq('store_id', storeId),
        ]);
        const used = new Set<string>();
        (ss?.data ?? []).forEach((r: any) => { if (r?.module_key) used.add(String(r.module_key)); });
        (reg?.data ?? []).forEach((r: any) => Object.values(r).forEach((v) => { if (typeof v === 'string') used.add(v); }));
        trialUsed = Array.from(used);
      } catch { /* mantem vazio */ }

      if (!alive) return;
      setData({
        products: val(prod, null)?.count ?? 0,
        viewsRange: views,
        clicksRange: clicks,
        ctrRange: views > 0 ? (clicks / views) * 100 : 0,
        assistedRevenue: Number(val(overview, null)?.totalRevenue) || 0,
        clubCommission: sum(rewRows, 'amount'),
        totalVideos: rows.length,
        topVideo: best ? { title: best.title, views: best.views, clicks: best.clicks, conversions: best.conversions } : null,
        owned,
        trialDays,
        modules: sortModules(val(hub, []) || []),
        waitlist: wlRows.map((r) => String(r.module_slug)),
        trialUsed,
        referred: Number(val(aff, null)?.total_referred_stores) || 0,
      });
      setLoading(false);
    })();

    return () => { alive = false; };
  }, [storeId, range.start, range.end]);

  return { data, loading };
}

export interface Pulse { interactions: number; buyClicks: number; engaged: number; views: number }

export function usePulse(storeId: string | null | undefined) {
  const [pulse, setPulse] = useState<Pulse | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    const { data, error } = await sb.rpc('get_store_pulse', { p_store_id: storeId });
    if (error || !data) return;
    setPulse({
      interactions: Number(data.interactions) || 0,
      buyClicks: Number(data.buy_clicks) || 0,
      engaged: Number(data.engaged) || 0,
      views: Number(data.views) || 0,
    });
  }, [storeId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  return pulse;
}

export async function joinWaitlist(storeId: string, slug: string): Promise<boolean> {
  const { error } = await sb.from('module_waitlist').insert({ store_id: storeId, module_slug: slug });
  return !error || error.code === '23505';
}