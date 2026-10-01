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

  
  // --- VIDEOS (SINCRONIZADO COM BIBLIOTECA) ---
  static async getVideos(storeId?: string): Promise<any[]> {
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

