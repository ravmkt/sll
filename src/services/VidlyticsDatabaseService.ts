import { supabase } from '../lib/supabase';

export interface OverviewMetrics {
  totalViews: number;
  totalCtaClicks: number;
  totalProductClicks: number;
  estimatedRevenue: number;
}

export interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status?: string;
}

export const VidlyticsDatabaseService = {
  /**
   * Busca métricas acumuladas da loja
   */
  async getStoreMetrics(storeId: string): Promise<OverviewMetrics> {
    const { data, error } = await supabase
      .from('daily_store_metrics')
      .select('views_count, cta_clicks_count, product_clicks_count, estimated_revenue')
      .eq('store_id', storeId);

    if (error) {
      console.error('Erro ao buscar métricas diárias:', error);
      return { totalViews: 0, totalCtaClicks: 0, totalProductClicks: 0, estimatedRevenue: 0 };
    }

    return (data || []).reduce(
      (acc, row) => ({
        totalViews: acc.totalViews + (row.views_count || 0),
        totalCtaClicks: acc.totalCtaClicks + (row.cta_clicks_count || 0),
        totalProductClicks: acc.totalProductClicks + (row.product_clicks_count || 0),
        estimatedRevenue: acc.estimatedRevenue + Number(row.estimated_revenue || 0),
      }),
      { totalViews: 0, totalCtaClicks: 0, totalProductClicks: 0, estimatedRevenue: 0 }
    );
  },

  /**
   * Busca os vídeos da loja
   */
  async getVideos(storeId: string, limit = 5): Promise<VideoItem[]> {
    const { data, error } = await supabase
      .from('videos')
      .select('id, title, thumbnail_url')
      .eq('store_id', storeId)
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar vídeos:', error);
      return [];
    }

    return (data as VideoItem[]) || [];
  }
};
