import { supabaseVidlytics, supabasePublic } from './supabaseClients';

export interface NewVideoInput {
  store_id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  active?: boolean;
}

export interface StoryItem {
  id: string;
  store_id: string;
  title: string;
  active?: boolean;
  position?: number;
  view_count?: number;
  click_count?: number;
  cta_enabled?: boolean;
  cta_text?: string;
  cta_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const VidlyticsDatabaseService = {
  // ==========================================
  // --- VÍDEOS (vidlytics.videos) ---
  // ==========================================
  async getVideos(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('videos')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getVideoById(videoId: string) {
    const { data, error } = await supabaseVidlytics
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
    if (error) throw error;
    return data;
  },

  async createVideo(video: NewVideoInput) {
    const { data, error } = await supabaseVidlytics
      .from('videos')
      .insert([
        {
          store_id: video.store_id,
          title: video.title,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url || '',
          active: video.active !== undefined ? video.active : true,
          status: 'active',
          video_source_type: 'upload',
          source_type: 'upload'
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateVideo(videoId: string, updates: Record<string, any>) {
    const { data, error } = await supabaseVidlytics
      .from('videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteVideo(videoId: string) {
    const { error } = await supabaseVidlytics
      .from('videos')
      .delete()
      .eq('id', videoId);
    if (error) throw error;
    return true;
  },

  // ==========================================
  // --- STORIES (vidlytics.stories & story_videos) ---
  // ==========================================
  async getStories(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('stories')
      .select('*')
      .eq('store_id', storeId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createStory(story: { store_id: string; title: string; active?: boolean; position?: number }) {
    const { data, error } = await supabaseVidlytics
      .from('stories')
      .insert([
        {
          store_id: story.store_id,
          title: story.title,
          active: story.active !== undefined ? story.active : true,
          position: story.position || 0,
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStory(storyId: string, updates: Record<string, any>) {
    const { data, error } = await supabaseVidlytics
      .from('stories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', storyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStory(storyId: string) {
    // Exclui relacionamentos com vídeos primeiro
    await supabaseVidlytics
      .from('story_videos')
      .delete()
      .eq('story_id', storyId);

    const { error } = await supabaseVidlytics
      .from('stories')
      .delete()
      .eq('id', storyId);
    if (error) throw error;
    return true;
  },

  async getStoryVideos(storyId: string) {
    const { data, error } = await supabaseVidlytics
      .from('story_videos')
      .select('*, video:videos(*)')
      .eq('story_id', storyId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async syncStoryVideos(storeId: string, storyId: string, videoIds: string[]) {
    // Remove os vínculos atuais
    await supabaseVidlytics
      .from('story_videos')
      .delete()
      .eq('story_id', storyId);

    if (videoIds.length === 0) return true;

    // Adiciona os novos na ordem
    const rows = videoIds.map((vId, idx) => ({
      store_id: storeId,
      story_id: storyId,
      video_id: vId,
      position: idx,
      is_cover: idx === 0
    }));

    const { error } = await supabaseVidlytics
      .from('story_videos')
      .insert(rows);

    if (error) throw error;
    return true;
  },

  // ==========================================
  // --- MÉTRICAS (vidlytics.daily_video_metrics) ---
  // ==========================================
  async getDailyMetrics(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('daily_video_metrics')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false })
      .limit(30);
    if (error) throw error;
    return data || [];
  },

  // ==========================================
  // --- APARÊNCIA & WIDGET (vidlytics.appearances) ---
  // ==========================================
  async getAppearances(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('appearances')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertAppearances(storeId: string, appearanceData: Record<string, any>) {
    const { data, error } = await supabaseVidlytics
      .from('appearances')
      .upsert({ store_id: storeId, ...appearanceData, updated_at: new Date().toISOString() }, { onConflict: 'store_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ==========================================
  // --- CATÁLOGO DE PRODUTOS (public.products) ---
  // ==========================================
  // ==========================================
  // --- CATÁLOGO DE PRODUTOS (public.products) ---
  // ==========================================
  async getProducts(storeId: string) {
    const { data, error } = await supabasePublic
      .from('products')
      .select('id, name, price, promotional_price, image_url, permalink')
      .eq('store_id', storeId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  },

  // ==========================================
  // --- VISÃO GERAL / DASHBOARD ---
  // ==========================================
  async getDashboardOverview(storeId: string) {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [
      videosRes,
      storiesRes,
      appearancesRes,
      conversionsRes,
      activityRes,
      usageRes
    ] = await Promise.allSettled([
      supabaseVidlytics.from('videos').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
      supabaseVidlytics.from('stories').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
      supabaseVidlytics.from('appearances').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
      supabaseVidlytics.from('conversions').select('order_value, status, created_at').eq('store_id', storeId),
      supabaseVidlytics.from('activity_logs').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(15),
      supabaseVidlytics.from('daily_video_metrics').select('views_count').eq('store_id', storeId).gte('date', `${currentMonth}-01`),
    ]);

    const videosCount = videosRes.status === 'fulfilled' ? videosRes.value.count || 0 : 0;
    const storiesCount = storiesRes.status === 'fulfilled' ? storiesRes.value.count || 0 : 0;
    const appearancesCount = appearancesRes.status === 'fulfilled' ? appearancesRes.value.count || 0 : 0;
    const activities = activityRes.status === 'fulfilled' ? (activityRes.value.data || []) : [];

    let paidRevenue = 0;
    let paidCount = 0;
    let pendingRevenue = 0;
    let pendingCount = 0;

    if (conversionsRes.status === 'fulfilled' && conversionsRes.value.data) {
      for (const item of conversionsRes.value.data) {
        const val = Number(item.order_value) || 0;
        const st = String(item.status || 'pending').toLowerCase();
        if (st === 'paid' || st === 'approved' || st === 'completed') {
          paidRevenue += val;
          paidCount += 1;
        } else {
          pendingRevenue += val;
          pendingCount += 1;
        }
      }
    }

    let viewsUsedMonth = 0;
    if (usageRes.status === 'fulfilled' && usageRes.value.data) {
      viewsUsedMonth = usageRes.value.data.reduce((acc: number, curr: any) => acc + (Number(curr.views_count) || 0), 0);
    }

    return {
      videosCount,
      storiesCount,
      appearancesCount,
      activities,
      paidRevenue,
      paidCount,
      pendingRevenue,
      pendingCount,
      viewsUsedMonth
    };
  }
};