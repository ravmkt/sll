import { supabase } from './supabaseClients';

export interface NewVideoInput {
  store_id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  active?: boolean;
}

export const VidlyticsDatabaseService = {
  // Vídeos do Widget
  async getVideos(storeId: string) {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createVideo(video: NewVideoInput) {
    const { data, error } = await supabase
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

  async deleteVideo(videoId: string) {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);
    if (error) throw error;
    return true;
  },

  // Stories
  async getStories(storeId: string) {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Métricas Diárias de Vídeo
  async getDailyMetrics(storeId: string) {
    const { data, error } = await supabase
      .from('daily_video_metrics')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Widget Selectors
  async getWidgetSelectors(storeId: string) {
    const { data, error } = await supabase
      .from('widget_selectors')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  }
};
