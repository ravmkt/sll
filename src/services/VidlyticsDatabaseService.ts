import { supabaseVidlytics, supabasePublic } from './supabaseClients';

export interface NewVideoInput {
  store_id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  active?: boolean;
}

export const VidlyticsDatabaseService = {
  // --- VÍDEOS ---
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

  // --- STORIES ---
  async getStories(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('stories')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // --- MÉTRICAS ---
  async getDailyMetrics(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('daily_video_metrics')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // --- WIDGET SELECTORS & APPARÊNCIA ---
  async getWidgetSelectors(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('widget_selectors')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data || [];
  },

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
      .upsert({ store_id: storeId, ...appearanceData, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Catálogo de produtos (Core/public) para taggear nos vídeos
  async getProducts(storeId: string) {
    const { data, error } = await supabasePublic
      .from('products')
      .select('id, name, price, promotional_price, image_url, permalink')
      .eq('store_id', storeId)
      .order('name');
    if (error) throw error;
    return data || [];
  }
};
