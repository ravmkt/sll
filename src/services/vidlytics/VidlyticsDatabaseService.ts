import { supabase } from '@/lib/supabase';
import { DisplayLocation, PageRuleType, DisplayPosition } from '@/types/vidlytics';

export interface VidlyticsComment {
  id: string;
  video_id: string;
  author_name: string | null;
  content: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  created_at: string | null;
}

export interface VidlyticsCommentReply {
  id: string;
  comment_id: string;
  store_id: string;
  author_name: string;
  content: string;
  created_at: string | null;
}

export interface VidlyticsAppearance {
  id?: string;
  store_id: string;
  name: string;
  widget_style: Record<string, any>;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VidlyticsOverviewMetrics {
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalLikes: number;
  totalComments: number;
  ctr: number;
  dailySeries: { date: string; views: number; clicks: number; likes: number; ctr: number }[];
}

export interface VidlyticsVideoRow {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  status: string;
  views: number;
  clicks: number;
  ctr: number;
  likes: number;
  comments: number;
  conversions: number;
  revenue: number;
}

export interface VidlyticsRetentionRow {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  views: number;
  clicks: number;
  conversions: number;
  clickDropRate: number;
  conversionDropRate: number;
}

export interface VidlyticsInsightRow {
  id: string;
  videoId: string | null;
  videoTitle: string | null;
  insightText: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export class VidlyticsDatabaseService {
  private static SCHEMA = 'vidlytics';
  private static TABLE_APPEARANCES = 'vid_appearances';

  static async getAppearances(storeId: string): Promise<VidlyticsAppearance[]> {
    if (!storeId) {
      console.warn('[VidlyticsDatabaseService] Não foi possível buscar aparências: storeId ausente.');
      return [];
    }
    const { data, error } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao buscar aparências:', error);
      throw error;
    }
    return data || [];
  }

  static async getAppearanceById(appearanceId: string): Promise<VidlyticsAppearance | null> {
    if (!appearanceId) return null;
    const { data, error } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .select('*')
      .eq('id', appearanceId)
      .maybeSingle();
    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao buscar aparência por ID:', error);
      throw error;
    }
    return data;
  }

  static async saveAppearance(
    storeId: string,
    appearance: Omit<VidlyticsAppearance, 'store_id'>
  ): Promise<VidlyticsAppearance> {
    if (!storeId) {
      throw new Error('Loja não identificada. O storeId é obrigatório para salvar o estilo.');
    }
    const payload = {
      ...appearance,
      store_id: storeId,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .upsert(payload)
      .select()
      .single();
    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao salvar aparência:', error);
      throw error;
    }
    return data;
  }

  static async setDefaultAppearance(storeId: string, appearanceId: string): Promise<void> {
    if (!storeId || !appearanceId) return;
    const { error: resetError } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .update({ is_default: false })
      .eq('store_id', storeId);
    if (resetError) {
      console.error('[VidlyticsDatabaseService] Erro ao resetar estilo padrão:', resetError);
      throw resetError;
    }
    const { error: setError } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', appearanceId)
      .eq('store_id', storeId);
    if (setError) {
      console.error('[VidlyticsDatabaseService] Erro ao definir estilo padrão:', setError);
      throw setError;
    }
  }

  static async deleteAppearance(storeId: string, appearanceId: string): Promise<void> {
    if (!storeId || !appearanceId) return;
    const { error } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .delete()
      .eq('id', appearanceId)
      .eq('store_id', storeId);
    if (error) {
      console.error('[VidlyticsDatabaseService] Erro ao deletar aparência:', error);
      throw error;
    }
  }

  static async getVideosPerformance(storeId: string, startDate: string, endDate: string): Promise<VidlyticsVideoRow[]> {
    const rows = await VidlyticsDatabaseService.getVideosPerformanceBase(storeId, startDate, endDate);
    if (rows.length === 0) return rows;
    const ids = rows.map((r) => r.id);
    const endTs = endDate.length <= 10 ? endDate + 'T23:59:59.999Z' : endDate;

    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('video_likes').select('video_id').eq('store_id', storeId).in('video_id', ids).gte('created_at', startDate).lte('created_at', endTs),
      supabase.from('comments').select('video_id').eq('store_id', storeId).in('video_id', ids).gte('created_at', startDate).lte('created_at', endTs),
    ]);
    if (likesRes.error) throw likesRes.error;
    if (commentsRes.error) throw commentsRes.error;

    const likeMap = new Map<string, number>();
    (likesRes.data || []).forEach((l: any) => likeMap.set(l.video_id, (likeMap.get(l.video_id) || 0) + 1));
    const commentMap = new Map<string, number>();
    (commentsRes.data || []).forEach((c: any) => commentMap.set(c.video_id, (commentMap.get(c.video_id) || 0) + 1));

    const events = await VidlyticsDatabaseService.fetchActivityEvents(storeId, startDate, endDate);
    const viewMap = new Map<string, number>();
    const clickMap = new Map<string, number>();
    events.forEach((e) => {
      if (!e.video_id) return;
      const m = e.event_type === 'video_view' ? viewMap : clickMap;
      m.set(e.video_id, (m.get(e.video_id) || 0) + 1);
    });
    return rows.map((r: any) => {
      const views = viewMap.get(r.id) || 0;
      const clicks = clickMap.get(r.id) || 0;
      const o: any = { ...r, views, clicks, likes: likeMap.get(r.id) || 0, comments: commentMap.get(r.id) || 0 };
      if ('ctr' in r) o.ctr = views > 0 ? (clicks / views) * 100 : 0;
      return o as VidlyticsVideoRow;
    });
  }

  private static async fetchActivityEvents(storeId: string, startDate: string, endDate: string): Promise<{ event_type: string; video_id: string | null; created_at: string }[]> {
    const endTs = endDate.length <= 10 ? endDate + 'T23:59:59.999Z' : endDate;
    const out: { event_type: string; video_id: string | null; created_at: string }[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await supabase
        .from('store_activity_events')
        .select('event_type, video_id, created_at')
        .eq('store_id', storeId)
        .in('event_type', ['video_view', 'product_click', 'whatsapp_click'])
        .gte('created_at', startDate)
        .lte('created_at', endTs)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + page - 1);
      if (error) throw error;
      out.push(...((data as any[]) || []));
      if (!data || data.length < page) break;
    }
    return out;
  }

  static async getOverviewMetrics(storeId: string, startDate: string, endDate: string): Promise<VidlyticsOverviewMetrics> {
    const base = await VidlyticsDatabaseService.getOverviewMetricsBase(storeId, startDate, endDate);
    const events = await VidlyticsDatabaseService.fetchActivityEvents(storeId, startDate, endDate);
    let totalViews = 0;
    let totalClicks = 0;
    const series = new Map<string, any>();
    base.dailySeries.forEach((p: any) => series.set(p.date, { ...p, views: 0, clicks: 0 }));
    events.forEach((e) => {
      const d = String(e.created_at).slice(0, 10);
      const p = series.get(d) || { date: d, views: 0, clicks: 0, likes: 0, ctr: 0 };
      if (e.event_type === 'video_view') { p.views += 1; totalViews += 1; } else { p.clicks += 1; totalClicks += 1; }
      series.set(d, p);
    });
    const dailySeries = Array.from(series.values())
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
      .map((p: any) => ({ ...p, ctr: p.views > 0 ? (p.clicks / p.views) * 100 : 0 }));
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const endTsC = endDate.length <= 10 ? endDate + 'T23:59:59.999Z' : endDate;
    const { data: convRows, error: convErr } = await supabase
      .from('sll_conversions')
      .select('total, source_id, created_at')
      .eq('store_id', storeId)
      .eq('module', 'vidlytics')
      .gte('created_at', startDate)
      .lte('created_at', endTsC);
    if (convErr) throw convErr;
    const totalConversions = (convRows || []).length;
    const totalRevenue = (convRows || []).reduce((s: number, c: any) => s + Number(c.total || 0), 0);
    return { ...base, totalViews, totalClicks, totalConversions, totalRevenue, ctr, dailySeries };
  }

  static async getOverviewMetricsBase(storeId: string, startDate: string, endDate: string): Promise<VidlyticsOverviewMetrics> {
    const endTs = endDate.length <= 10 ? endDate + 'T23:59:59.999Z' : endDate;
    const { data: dailyMetrics, error: metricsError } = await supabase
      .schema('vidlytics')
      .from('vid_daily_video_metrics')
      .select('metric_date, views, clicks, conversions')
      .eq('store_id', storeId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate);
    if (metricsError) throw metricsError;

    const { data: conversions, error: convError } = await supabase
      .schema('vidlytics')
      .from('vid_conversions')
      .select('order_value, converted_at')
      .eq('store_id', storeId)
      .gte('converted_at', startDate)
      .lte('converted_at', endDate);
    if (convError) throw convError;

    const { data: videos, error: videosError } = await supabase
      .schema('vidlytics')
      .from('vid_videos')
      .select('id')
      .eq('store_id', storeId);
    if (videosError) throw videosError;
    const videoIds = (videos || []).map((v: any) => v.id);

    let likes: any[] = [];
    let comments: any[] = [];

    if (videoIds.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from('video_likes')
        .select('created_at, video_id')
        .in('video_id', videoIds)
        .gte('created_at', startDate)
        .lte('created_at', endTs);
      if (likesError) throw likesError;
      likes = likesData || [];

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('created_at, video_id')
        .in('video_id', videoIds)
        .gte('created_at', startDate)
        .lte('created_at', endTs);
      if (commentsError) throw commentsError;
      comments = commentsData || [];
    }

    const totalViews = (dailyMetrics || []).reduce((s: number, m: any) => s + (m.views || 0), 0);
    const totalClicks = (dailyMetrics || []).reduce((s: number, m: any) => s + (m.clicks || 0), 0);
    const totalConversions = (conversions || []).length;
    const totalRevenue = (conversions || []).reduce((s: number, c: any) => s + Number(c.order_value || 0), 0);
    const totalLikes = likes.length;
    const totalComments = comments.length;
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    const seriesMap = new Map<string, { views: number; clicks: number; likes: number }>();
    (dailyMetrics || []).forEach((m: any) => {
      const key = m.metric_date;
      const entry = seriesMap.get(key) || { views: 0, clicks: 0, likes: 0 };
      entry.views += m.views || 0;
      entry.clicks += m.clicks || 0;
      seriesMap.set(key, entry);
    });
    likes.forEach((l: any) => {
      const key = String(l.created_at).slice(0, 10);
      const entry = seriesMap.get(key) || { views: 0, clicks: 0, likes: 0 };
      entry.likes += 1;
      seriesMap.set(key, entry);
    });

    const dailySeries = Array.from(seriesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        views: v.views,
        clicks: v.clicks,
        likes: v.likes,
        ctr: v.views > 0 ? (v.clicks / v.views) * 100 : 0,
      }));

    return { totalViews, totalClicks, totalConversions, totalRevenue, totalLikes, totalComments, ctr, dailySeries };
  }

  
  // --- VIDEOS (SINCRONIZADO COM BIBLIOTECA) ---
  static async getVideos(storeId?: string, limit?: number): Promise<any[]> {
    const all = await this.getVideosAll(storeId);
    return limit && limit > 0 ? all.slice(0, limit) : all;
  }

  private static async getVideosAll(storeId?: string): Promise<any[]> {
    try {
      const vidlyticsDb = (supabase as any).schema
        ? (supabase as any).schema('vidlytics')
        : supabase;

      let query = vidlyticsDb.from('vid_videos').select('*');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error || !data || data.length === 0) {
        const fallback = await vidlyticsDb.from('vid_videos').select('*').order('created_at', { ascending: false });
        return fallback.data || [];
      }
      return data || [];
    } catch (err) {
      console.error('[VidlyticsDatabaseService] Falha em getVideos:', err);
      return [];
    }
  }

    // --- PERFORMANCE / RETENCAO / INSIGHTS ---
  private static periodRange(start: string, end: string) {
    return { startDay: String(start).slice(0, 10), endDay: String(end).slice(0, 10) };
  }

  private static async fetchAll(build: (from: number, to: number) => any): Promise<any[]> {
    const pageSize = 1000;
    const rows: any[] = [];
    for (let page = 0; page < 50; page++) {
      const { data, error } = await build(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < pageSize) break;
    }
    return rows;
  }

  // Conversoes por video (vidlytics.vid_daily_video_metrics). Se falhar, retorna vazio (0).
  private static async getConversionsByVideo(storeId: string, startDay: string, endDay: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    try {
      const vdb: any = (supabase as any).schema ? (supabase as any).schema('vidlytics') : supabase;
      const rows = await this.fetchAll((a, b) =>
        vdb
          .from('vid_daily_video_metrics')
          .select('id, video_id, conversions')
          .eq('store_id', storeId)
          .gte('metric_date', startDay)
          .lte('metric_date', endDay)
          .order('id', { ascending: true })
          .range(a, b)
      );
      for (const r of rows) {
        const k = String(r.video_id);
        map.set(k, (map.get(k) || 0) + (Number(r.conversions) || 0));
      }
    } catch (err) {
      console.warn('[VidlyticsDatabaseService] Conversoes indisponiveis:', err);
    }
    return map;
  }

  static async getVideosPerformanceBase(storeId: string, startDate: string, endDate: string): Promise<VidlyticsVideoRow[]> {
    const db: any = supabase;
    const { startDay, endDay } = this.periodRange(startDate, endDate);
    const [allVideos, metrics, conversions] = await Promise.all([
      this.getVideos(storeId),
      this.fetchAll((a, b) =>
        db
          .from('daily_video_metrics')
          .select('id, video_id, views_count, cta_clicks_count, likes_count, comments_count')
          .eq('store_id', storeId)
          .gte('date', startDay)
          .lte('date', endDay)
          .order('id', { ascending: true })
          .range(a, b)
      ),
      this.getConversionsByVideo(storeId, startDay, endDay),
    ]);

    const acc = new Map<string, { views: number; clicks: number; likes: number; comments: number }>();
    for (const m of metrics) {
      const k = String(m.video_id);
      const cur = acc.get(k) || { views: 0, clicks: 0, likes: 0, comments: 0 };
      cur.views += Number(m.views_count) || 0;
      cur.clicks += Number(m.cta_clicks_count) || 0;
      cur.likes += Number(m.likes_count) || 0;
      cur.comments += Number(m.comments_count) || 0;
      acc.set(k, cur);
    }

    return allVideos
      .filter((v: any) => v.store_id === storeId)
      .map((v: any): VidlyticsVideoRow => {
        const id = String(v.id);
        const m = acc.get(id) || { views: 0, clicks: 0, likes: 0, comments: 0 };
        return {
          id,
          title: v.title || 'Vídeo sem título',
          thumbnailUrl: v.thumbnail_url || null,
          status: String(v.status || (v.active === false ? 'inactive' : 'active')),
          views: m.views,
          clicks: m.clicks,
          ctr: m.views > 0 ? (m.clicks / m.views) * 100 : 0,
          likes: m.likes,
          comments: m.comments,
          conversions: conversions.get(id) || 0,
          revenue: 0, // sem receita por video no banco atual
        };
      })
      .sort((x, y) => y.views - x.views);
  }

  // Funil por video: Views -> Cliques -> Conversoes (queda percentual entre etapas)
  static async getRetentionData(storeId: string, startDate: string, endDate: string): Promise<VidlyticsRetentionRow[]> {
    const perf = await this.getVideosPerformance(storeId, startDate, endDate);
    const drop = (from: number, to: number) => (from > 0 ? Math.min(100, Math.max(0, ((from - to) / from) * 100)) : 0);
    return perf.map((p): VidlyticsRetentionRow => ({
      id: p.id,
      title: p.title,
      thumbnailUrl: p.thumbnailUrl,
      views: p.views,
      clicks: p.clicks,
      conversions: p.conversions,
      clickDropRate: drop(p.views, p.clicks),
      conversionDropRate: drop(p.clicks, p.conversions),
    }));
  }

  // Insights por regras sobre dados reais (sem LLM)
  static async getAiInsights(storeId: string, startDate: string, endDate: string): Promise<VidlyticsInsightRow[]> {
    const perf = await this.getVideosPerformance(storeId, startDate, endDate);
    const active = perf.filter((p) => p.views > 0);
    if (active.length === 0) return [];

    const now = new Date().toISOString();
    const pct = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;
    const out: VidlyticsInsightRow[] = [];
    const add = (v: VidlyticsVideoRow | null, kind: string, text: string) =>
      out.push({
        id: `${kind}-${v ? v.id : 'geral'}`,
        videoId: v ? v.id : null,
        videoTitle: v ? v.title : null,
        insightText: text,
        metadata: { kind },
        createdAt: now,
      });

    const totalViews = active.reduce((s, p) => s + p.views, 0);
    const totalClicks = active.reduce((s, p) => s + p.clicks, 0);
    add(null, 'summary', `No período foram ${totalViews.toLocaleString('pt-BR')} visualizações e ${totalClicks.toLocaleString('pt-BR')} cliques (CTR geral de ${pct(totalViews > 0 ? (totalClicks / totalViews) * 100 : 0)}).`);

    const top = active[0];
    add(top, 'top_views', `Vídeo mais visto: ${top.views.toLocaleString('pt-BR')} visualizações e ${top.clicks.toLocaleString('pt-BR')} cliques (CTR ${pct(top.ctr)}).`);

    const pool = active.filter((p) => p.views >= 5);
    const best = [...pool].sort((a, b) => b.ctr - a.ctr)[0];
    if (best && best.ctr > 0) {
      add(best, 'best_ctr', `Melhor CTR do período (${pct(best.ctr)}). Vale replicar o formato e o CTA deste vídeo.`);
    }

    pool
      .filter((p) => p.views >= 10 && p.ctr < 2)
      .slice(0, 2)
      .forEach((p) => add(p, 'low_ctr', `CTR baixo (${pct(p.ctr)}) com ${p.views.toLocaleString('pt-BR')} visualizações. Revise o CTA ou o produto vinculado.`));

    const engaged = [...active].sort((a, b) => b.likes + b.comments - (a.likes + a.comments))[0];
    if (engaged && engaged.likes + engaged.comments > 0) {
      add(engaged, 'engagement', `Maior engajamento: ${engaged.likes} curtidas e ${engaged.comments} comentários.`);
    }

    return out;
  }

  // --- STORIES ---
  private static normalizeStory(row: any): any {
    if (!row) return null;

    const config = row.config || {};

    return {
      id: row.id,
      store_id: row.store_id,
      title: row.title,
      name: row.title || config.name || '',
      cover_url: row.cover_url || config.cover_url || '',
      status: row.status || 'active',
      active: row.status === 'active' || row.status === 'ATIVO' || config.active === true,
      position: row.position ?? config.position ?? 0,
      layout: config.layout || config.format || 'carousel',
      format: config.format || config.layout || 'carousel',
      scroll_direction: config.scroll_direction || config.scrollDirection || 'horizontal',
      scrollDirection: config.scrollDirection || config.scroll_direction || 'horizontal',
      appearance_id: config.appearance_id || config.visualStyle || '',
      visualStyle: config.visualStyle || config.appearance_id || '',
      videoUrls: config.videoUrls || config.video_urls || [],
      video_ids: config.video_ids || config.videoUrls || [],
      displayLocations: config.displayLocations || config.display_locations || [],
      display_locations: config.display_locations || config.displayLocations || [],
      views: config.views || 0,
      clicks: config.clicks || 0,
      ctr: config.ctr || 0,
      created_at: row.created_at,
      config,
    };
  }

  static async getStories(storeId?: string): Promise<any[]> {
    try {
      const vidlyticsDb = (supabase as any).schema
        ? (supabase as any).schema('vidlytics')
        : supabase;

      let query = vidlyticsDb.from('vid_stories').select('*');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.warn('[VidlyticsDatabaseService] Erro ao buscar vid_stories:', error);
        return [];
      }
      return (data || []).map(this.normalizeStory);
    } catch (err) {
      console.warn('[VidlyticsDatabaseService] Falha em getStories:', err);
      return [];
    }
  }

  static async getStoryById(storyId: string): Promise<any | null> {
    try {
      const vidlyticsDb = (supabase as any).schema
        ? (supabase as any).schema('vidlytics')
        : supabase;

      const { data, error } = await vidlyticsDb
        .from('vid_stories')
        .select('*')
        .eq('id', storyId)
        .maybeSingle();

      if (error) throw error;
      return this.normalizeStory(data);
    } catch (err) {
      console.warn('[VidlyticsDatabaseService] Erro em getStoryById:', err);
      return null;
    }
  }

  static async saveStory(storeId: string, storyData: any): Promise<any> {
    try {
      const vidlyticsDb = (supabase as any).schema
        ? (supabase as any).schema('vidlytics')
        : supabase;

      const normalizedStatus =
        storyData.status === 'ATIVO' || storyData.status === 'active' || storyData.active === true
          ? 'active'
          : 'inactive';

      const config = {
        name: storyData.name || storyData.title || '',
        layout: storyData.layout || storyData.format || 'carousel',
        format: storyData.format || storyData.layout || 'carousel',
        scroll_direction: storyData.scrollDirection || storyData.scroll_direction || 'horizontal',
        scrollDirection: storyData.scrollDirection || storyData.scroll_direction || 'horizontal',
        appearance_id: storyData.visualStyle || storyData.appearance_id || '',
        visualStyle: storyData.visualStyle || storyData.appearance_id || '',
        appearance_snapshot: storyData.appearance_snapshot ?? null,
        appearance_name: storyData.appearance_name || '',
        videoUrls: storyData.videoUrls || storyData.video_ids || [],
        video_ids: storyData.video_ids || storyData.videoUrls || [],
        displayLocations: storyData.displayLocations || storyData.display_locations || [],
        display_locations: storyData.display_locations || storyData.displayLocations || [],
        active: normalizedStatus === 'active',
      };

      const payload: any = {
        store_id: storeId,
        title: storyData.name || storyData.title || 'Story sem título',
        status: normalizedStatus,
        position: typeof storyData.position === 'number' ? storyData.position : 0,
        config,
        cover_url: storyData.cover_url || null,
      };

      if (storyData.id) {
        const { data, error } = await vidlyticsDb
          .from('vid_stories')
          .update(payload)
          .eq('id', storyData.id)
          .select()
          .single();
        if (error) throw error;
        return this.normalizeStory(data);
      } else {
        const { data, error } = await vidlyticsDb
          .from('vid_stories')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return this.normalizeStory(data);
      }
    } catch (err) {
      console.error('[VidlyticsDatabaseService] Erro ao salvar Story:', err);
      throw err;
    }
  }

  static async deleteStory(storeId: string, storyId: string): Promise<boolean> {
    try {
      const vidlyticsDb = (supabase as any).schema
        ? (supabase as any).schema('vidlytics')
        : supabase;

      const { error } = await vidlyticsDb
        .from('vid_stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[VidlyticsDatabaseService] Erro ao deletar Story:', err);
      return false;
    }
  }
  // --- COMMENTS ---
  static async getComments(storeId: string): Promise<VidlyticsComment[]> {
    const { data: videos, error: videosError } = await supabase
      .schema('vidlytics')
      .from('vid_videos')
      .select('id')
      .eq('store_id', storeId);
    if (videosError) throw videosError;

    const videoIds = (videos || []).map((v: any) => v.id);
    if (videoIds.length === 0) return [];

    const { data, error } = await supabase
      .schema('vidlytics')
      .from('vid_comments')
      .select('*')
      .in('video_id', videoIds)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []) as VidlyticsComment[];
  }

  static async updateCommentStatus(
    commentId: string,
    status: VidlyticsComment['status']
  ): Promise<void> {
    const { error } = await supabase
      .schema('vidlytics')
      .from('vid_comments')
      .update({ status })
      .eq('id', commentId);
    if (error) throw error;
  }

  static async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .schema('vidlytics')
      .from('vid_comments')
      .delete()
      .eq('id', commentId);
    if (error) throw error;
  }

  static async getCommentReplies(commentIds: string[]): Promise<VidlyticsCommentReply[]> {
    if (commentIds.length === 0) return [];
    const { data, error } = await supabase
      .schema('vidlytics')
      .from('vid_comment_replies')
      .select('*')
      .in('comment_id', commentIds)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as VidlyticsCommentReply[];
  }

  static async addCommentReply(
    commentId: string,
    storeId: string,
    authorName: string,
    content: string
  ): Promise<VidlyticsCommentReply> {
    const { data, error } = await supabase
      .schema('vidlytics')
      .from('vid_comment_replies')
      .insert({ comment_id: commentId, store_id: storeId, author_name: authorName, content })
      .select()
      .single();
    if (error) throw error;
    return data as VidlyticsCommentReply;
  }
}

