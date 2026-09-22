import { supabaseLiveCommerce, supabasePublic } from './supabaseClients';

export interface NewLiveInput {
  store_id: string;
  title: string;
  youtube_url: string;
  youtube_video_id?: string;
  status?: 'scheduled' | 'live' | 'finished';
  scheduled_at?: string;
  is_active?: boolean;
}

export interface LiveItem {
  id: string;
  store_id: string;
  title: string;
  youtube_video_id?: string | null;
  youtube_thumbnail_url?: string | null;
  youtube_url?: string | null;
  status: 'scheduled' | 'live' | 'finished';
  is_active: boolean;
  scheduled_at?: string | null;
  created_at: string;
}

export interface LiveSettings {
  store_id: string;
  widget_divulgacao?: any;
  widget_aovivo?: any;
  player_settings?: any;
  updated_at?: string;
}

export const LiveCommerceDatabaseService = {
  // ==========================================
  // --- LIVES (live_commerce.lives) ---
  // ==========================================
  async getLives(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as LiveItem[];
  },

  async getLiveById(liveId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();
    if (error) throw error;
    return data as LiveItem;
  },

  async createLive(live: NewLiveInput) {
    let videoId = live.youtube_video_id;
    if (!videoId && live.youtube_url) {
      const match = live.youtube_url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/
      );
      if (match) videoId = match[1];
    }

    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .insert([
        {
          store_id: live.store_id,
          title: live.title,
          youtube_url: live.youtube_url,
          youtube_video_id: videoId || null,
          status: live.status || 'scheduled',
          scheduled_at: live.scheduled_at || new Date().toISOString(),
          is_active: live.is_active !== undefined ? live.is_active : true,
          youtube_thumbnail_url: videoId
            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            : null
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return data as LiveItem;
  },

  async updateLive(liveId: string, updates: Partial<LiveItem> & Record<string, any>) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .update(updates)
      .eq('id', liveId)
      .select()
      .single();
    if (error) throw error;
    return data as LiveItem;
  },

  async deleteLive(liveId: string) {
    const { error } = await supabaseLiveCommerce
      .from('lives')
      .delete()
      .eq('id', liveId);
    if (error) throw error;
    return true;
  },

  // ==========================================
  // --- CONFIGURAÇÕES DE APARÊNCIA (live_commerce.live_settings) ---
  // ==========================================
  async getLiveSettings(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_settings')
      .select('widget_divulgacao, widget_aovivo, player_settings')
      .eq('store_id', storeId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getSettings(storeId: string) {
    return this.getLiveSettings(storeId);
  },

  async upsertLiveSettings(storeId: string, settings: {
    widget_divulgacao?: any;
    widget_aovivo?: any;
    player_settings?: any;
  }) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_settings')
      .upsert(
        {
          store_id: storeId,
          ...settings,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'store_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveSettings(storeId: string, settings: {
    widget_divulgacao?: any;
    widget_aovivo?: any;
    player_settings?: any;
  }) {
    return this.upsertLiveSettings(storeId, settings);
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
    return (data || []).map(p => ({
      ...p,
      product_url: p.permalink || ''
    }));
  }
};
