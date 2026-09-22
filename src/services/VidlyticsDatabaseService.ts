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
  async getProducts(storeId: string) {
    const { data, error } = await supabasePublic
      .from('products')
      .select('id, name, price, promotional_price, image_url, permalink')
      .eq('store_id', storeId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }
};
