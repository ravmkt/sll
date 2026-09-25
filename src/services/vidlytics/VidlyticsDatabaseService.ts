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

  /**
   * Funil de Retenção por vídeo: Views -> Cliques -> Conversões.
   * Obs: o schema atual não possui eventos de progresso segundo a segundo,
   * então mostramos a taxa de queda entre as 3 etapas do funil (dado 100% real).
   */
  static async getRetentionData(storeId: string, startDate: string, endDate: string): Promise<VidlyticsRetentionRow[]> {
    const { data: videos, error: videosError } = await supabase
      .schema(this.SCHEMA)
      .from('vid_videos')
      .select('id, title, thumbnail_url')
      .eq('store_id', storeId);
    if (videosError) throw videosError;
    if (!videos || videos.length === 0) return [];

    const videoIds = videos.map((v: any) => v.id);

    const { data: dailyMetrics, error: metricsError } = await supabase
      .schema(this.SCHEMA)
      .from('vid_daily_video_metrics')
      .select('video_id, views, clicks, conversions')
      .in('video_id', videoIds)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate);
    if (metricsError) throw metricsError;

    return videos
      .map((v: any) => {
        const rows = (dailyMetrics || []).filter((m: any) => m.video_id === v.id);
        const views = rows.reduce((s: number, m: any) => s + (m.views || 0), 0);
        const clicks = rows.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
        const conversions = rows.reduce((s: number, m: any) => s + (m.conversions || 0), 0);

        const clickDropRate = views > 0 ? 100 - (clicks / views) * 100 : 0;
        const conversionDropRate = clicks > 0 ? 100 - (conversions / clicks) * 100 : 0;

        return {
          id: v.id,
          title: v.title,
          thumbnailUrl: v.thumbnail_url,
          views,
          clicks,
          conversions,
          clickDropRate,
          conversionDropRate,
        };
      })
      .sort((a, b) => b.views - a.views);
  }

  /**
   * Busca insights de IA gerados para a loja no período selecionado.
   */
  static async getAiInsights(storeId: string, startDate: string, endDate: string): Promise<VidlyticsInsightRow[]> {
    const { data: insights, error: insightsError } = await supabase
      .schema(this.SCHEMA)
      .from('vid_ai_insights')
      .select('id, video_id, insight_text, metadata, created_at')
      .eq('store_id', storeId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    if (insightsError) throw insightsError;
    if (!insights || insights.length === 0) return [];

    const videoIds = [...new Set(insights.map((i: any) => i.video_id).filter(Boolean))];
    let videosMap = new Map<string, string>();

    if (videoIds.length > 0) {
      const { data: videos, error: videosError } = await supabase
        .schema(this.SCHEMA)
        .from('vid_videos')
        .select('id, title')
        .in('id', videoIds);
      if (videosError) throw videosError;
      (videos || []).forEach((v: any) => videosMap.set(v.id, v.title));
    }

    return insights.map((i: any) => ({
      id: i.id,
      videoId: i.video_id,
      videoTitle: i.video_id ? videosMap.get(i.video_id) || null : null,
      insightText: i.insight_text,
      metadata: i.metadata,
      createdAt: i.created_at,
    }));
  }

  // ==================== STORIES ====================

  static async getStories(storeId: string): Promise<any[]> {
    const { data: stories, error } = await supabase
      .schema(this.SCHEMA)
      .from('vid_stories')
      .select('*')
      .eq('store_id', storeId)
      .order('position', { ascending: true });
    if (error) throw error;
    if (!stories || stories.length === 0) return [];

    const storyIds = stories.map((s: any) => s.id);

    const { data: storyVideos, error: svError } = await supabase
      .schema(this.SCHEMA)
      .from('vid_story_videos')
      .select('story_id, video_url')
      .in('story_id', storyIds);
    if (svError) throw svError;

    const { data: dailyMetrics, error: metricsError } = await supabase
      .schema(this.SCHEMA)
      .from('vid_daily_video_metrics')
      .select('video_id, views, clicks')
      .eq('store_id', storeId);
    if (metricsError) throw metricsError;

    return stories.map((s: any) => {
      const videos = (storyVideos || []).filter((v: any) => v.story_id === s.id);
      const config = s.config || {};
      return {
        id: s.id,
        name: s.title,
        coverUrl: s.cover_url,
        status: s.status,
        position: s.position,
        videosCount: videos.length,
        layout: config.layout || 'carrossel',
        scrollDirection: config.scrollDirection || 'Horizontal',
        visualStyle: config.visualStyle || 'Seguir Padrão do App',
        cssSelector: config.cssSelector || '',
        displayPosition: config.displayPosition || 'Acima do elemento',
        pages: config.pages || [],
        views: 0,
        clicks: 0,
        ctr: 0,
      };
    });
  }

  static async getStoryById(storeId: string, storyId: string): Promise<any | null> {
    const { data: story, error } = await supabase
      .schema(this.SCHEMA)
      .from('vid_stories')
      .select('*')
      .eq('id', storyId)
      .eq('store_id', storeId)
      .single();
    if (error) throw error;
    if (!story) return null;

    const { data: videos, error: vError } = await supabase
      .schema(this.SCHEMA)
      .from('vid_story_videos')
      .select('*')
      .eq('story_id', storyId)
      .order('position', { ascending: true });
    if (vError) throw vError;

    const config = story.config || {};
    return {
      id: story.id,
      name: story.title,
      coverUrl: story.cover_url,
      status: story.status,
      videos: videos || [],
      layout: config.layout || 'carrossel',
      scrollDirection: config.scrollDirection || 'Horizontal',
      visualStyle: config.visualStyle || 'Seguir Padrão do App',
      cssSelector: config.cssSelector || '',
      displayPosition: config.displayPosition || 'Acima do elemento',
      pages: config.pages || [],
    };
  }

  static async saveStory(storeId: string, story: {
    id?: string;
    name: string;
    status: 'ATIVO' | 'INATIVO';
    coverUrl?: string | null;
    layout: string;
    scrollDirection: string;
    visualStyle: string;
    cssSelector: string;
    displayPosition: string;
    pages: string[];
    videoUrls: string[];
  }): Promise<string> {
    const config = {
      layout: story.layout,
      scrollDirection: story.scrollDirection,
      visualStyle: story.visualStyle,
      cssSelector: story.cssSelector,
      displayPosition: story.displayPosition,
      pages: story.pages,
    };

    const payload: any = {
      store_id: storeId,
      title: story.name,
      cover_url: story.coverUrl || null,
      status: story.status === 'ATIVO' ? 'active' : 'inactive',
      config,
    };

    let storyId = story.id;

    if (storyId) {
      const { error } = await supabase
        .schema(this.SCHEMA)
        .from('vid_stories')
        .update(payload)
        .eq('id', storyId)
        .eq('store_id', storeId);
      if (error) throw error;

      const { error: delError } = await supabase
        .schema(this.SCHEMA)
        .from('vid_story_videos')
        .delete()
        .eq('story_id', storyId);
      if (delError) throw delError;
    } else {
      const { data, error } = await supabase
        .schema(this.SCHEMA)
        .from('vid_stories')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      storyId = data.id;
    }

    if (story.videoUrls.length > 0) {
      const rows = story.videoUrls.map((url, idx) => ({
        story_id: storyId,
        video_url: url,
        position: idx,
      }));
      const { error: insError } = await supabase
        .schema(this.SCHEMA)
        .from('vid_story_videos')
        .insert(rows);
      if (insError) throw insError;
    }

    return storyId!;
  }

  static async deleteStory(storeId: string, storyId: string): Promise<void> {
    const { error: delVideosError } = await supabase
      .schema(this.SCHEMA)
      .from('vid_story_videos')
      .delete()
      .eq('story_id', storyId);
    if (delVideosError) throw delVideosError;

    const { error } = await supabase
      .schema(this.SCHEMA)
      .from('vid_stories')
      .delete()
      .eq('id', storyId)
      .eq('store_id', storeId);
    if (error) throw error;
  }

  static async getVideosForPicker(storeId: string): Promise<{ id: string; title: string; videoUrl: string; thumbnailUrl: string | null }[]> {
    const { data, error } = await supabase
      .schema(this.SCHEMA)
      .from('vid_videos')
      .select('id, title, video_url, thumbnail_url')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((v: any) => ({
      id: v.id,
      title: v.title,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url,
    }));
  }
}

