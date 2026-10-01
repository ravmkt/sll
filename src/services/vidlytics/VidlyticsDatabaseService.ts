import { supabase } from '@/lib/supabase';
import { DisplayLocation, PageRuleType, DisplayPosition } from '@/types/vidlytics';

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

  static async getOverviewMetrics(storeId: string, startDate: string, endDate: string): Promise<VidlyticsOverviewMetrics> {
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
        .schema('vidlytics')
        .from('vid_video_likes')
        .select('created_at, video_id')
        .in('video_id', videoIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      if (likesError) throw likesError;
      likes = likesData || [];

      const { data: commentsData, error: commentsError } = await supabase
        .schema('vidlytics')
        .from('vid_comments')
        .select('created_at, video_id')
        .in('video_id', videoIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
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

  
  static async getVideos(storeId?: string): Promise<any[]> {
    try {
      let query = supabase
        .schema('vidlytics')
        .from('vid_videos')
        .select('*');

      if (storeId) {
        query = query.or('store_id.eq.' + storeId + ',store_id.is.null');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.warn('[VidlyticsDatabaseService] Erro ao buscar vid_videos:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[VidlyticsDatabaseService] Falha em getVideos:', err);
      return [];
    }
  }
}