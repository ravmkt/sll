import { supabase } from '@/lib/supabase';

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

export class VidlyticsDatabaseService {
  private static SCHEMA = 'vidlytics';
  private static TABLE_APPEARANCES = 'vid_appearances'; // Tabela oficial do schema vidlytics

  /**
   * Busca todos os estilos/aparências cadastrados para a loja ativa.
   */
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

  /**
   * Salva ou atualiza um estilo de aparência para a loja ativa.
   */
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

  /**
   * Define um estilo como o padrão oficial da loja e desmarca os demais.
   */
  static async setDefaultAppearance(storeId: string, appearanceId: string): Promise<void> {
    if (!storeId || !appearanceId) return;

    // 1. Desmarca a flag de padrão de todas as aparências da loja
    const { error: resetError } = await supabase
      .schema(this.SCHEMA)
      .from(this.TABLE_APPEARANCES)
      .update({ is_default: false })
      .eq('store_id', storeId);

    if (resetError) {
      console.error('[VidlyticsDatabaseService] Erro ao resetar estilo padrão:', resetError);
      throw resetError;
    }

    // 2. Marca a nova aparência selecionada como padrão
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

  /**
   * Exclui um estilo da loja.
   */
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

  static async getVideosPerformance(storeId: string, startDate: string, endDate: string): Promise<VidlyticsVideoRow[]> {
    const { data: videos, error: videosError } = await supabase
      .schema('vidlytics')
      .from('vid_videos')
      .select('id, title, thumbnail_url, status')
      .eq('store_id', storeId);
    if (videosError) throw videosError;
    if (!videos || videos.length === 0) return [];

    const videoIds = videos.map((v: any) => v.id);

    const { data: dailyMetrics, error: metricsError } = await supabase
      .schema('vidlytics')
      .from('vid_daily_video_metrics')
      .select('video_id, views, clicks')
      .in('video_id', videoIds)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate);
    if (metricsError) throw metricsError;

    const { data: likes, error: likesError } = await supabase
      .schema('vidlytics')
      .from('vid_video_likes')
      .select('video_id')
      .in('video_id', videoIds)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    if (likesError) throw likesError;

    const { data: comments, error: commentsError } = await supabase
      .schema('vidlytics')
      .from('vid_comments')
      .select('video_id')
      .in('video_id', videoIds)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    if (commentsError) throw commentsError;

    const { data: conversions, error: convError } = await supabase
      .schema('vidlytics')
      .from('vid_conversions')
      .select('video_id, order_value')
      .in('video_id', videoIds)
      .gte('converted_at', startDate)
      .lte('converted_at', endDate);
    if (convError) throw convError;

    return videos.map((v: any) => {
      const metricsForVideo = (dailyMetrics || []).filter((m: any) => m.video_id === v.id);
      const views = metricsForVideo.reduce((s: number, m: any) => s + (m.views || 0), 0);
      const clicks = metricsForVideo.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
      const likesCount = (likes || []).filter((l: any) => l.video_id === v.id).length;
      const commentsCount = (comments || []).filter((c: any) => c.video_id === v.id).length;
      const convForVideo = (conversions || []).filter((c: any) => c.video_id === v.id);
      const conversionsCount = convForVideo.length;
      const revenue = convForVideo.reduce((s: number, c: any) => s + Number(c.order_value || 0), 0);
      const ctr = views > 0 ? (clicks / views) * 100 : 0;

      return {
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnail_url,
        status: v.status,
        views,
        clicks,
        ctr,
        likes: likesCount,
        comments: commentsCount,
        conversions: conversionsCount,
        revenue,
      };
    });
  }
}




