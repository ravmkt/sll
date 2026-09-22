import { supabaseVidlytics } from './supabaseClients';

export const VidlyticsDatabaseService = {
  // Vídeos do Widget
  async getVideos(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('vid_videos')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Stories
  async getStories(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('vid_stories')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Métricas Diárias de Vídeo
  async getDailyMetrics(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('vid_daily_video_metrics')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Widget Selectors
  async getWidgetSelectors(storeId: string) {
    const { data, error } = await supabaseVidlytics
      .from('vid_widget_selectors')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  }
};
