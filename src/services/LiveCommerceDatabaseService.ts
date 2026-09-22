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

export const LiveCommerceDatabaseService = {
  // Obter todas as lives de uma loja
  async getLives(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Obter uma live específica por ID
  async getLiveById(liveId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();
    if (error) throw error;
    return data;
  },

  // Criar nova transmissão / live
  async createLive(live: NewLiveInput) {
    let videoId = live.youtube_video_id;
    if (!videoId && live.youtube_url) {
      const match = live.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/);
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
          youtube_thumbnail_url: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Atualizar dados da live
  async updateLive(liveId: string, updates: Record<string, any>) {
    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .update(updates)
      .eq('id', liveId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Atualizar status da live (ex: scheduled -> live -> finished)
  async updateLiveStatus(liveId: string, status: 'scheduled' | 'live' | 'finished', isActive = true) {
    const updates: Record<string, unknown> = { status, is_active: isActive };
    if (status === 'live') updates.started_at = new Date().toISOString();
    if (status === 'finished') updates.ended_at = new Date().toISOString();

    const { data, error } = await supabaseLiveCommerce
      .from('lives')
      .update(updates)
      .eq('id', liveId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Excluir Live
  async deleteLive(liveId: string) {
    const { error } = await supabaseLiveCommerce
      .from('lives')
      .delete()
      .eq('id', liveId);
    if (error) throw error;
    return true;
  },

  // Configurações Globais do Live Commerce da loja
  async getLiveSettings(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_settings')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Salvar/Atualizar Configurações Globais
  async upsertLiveSettings(storeId: string, settings: Record<string, any>) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_settings')
      .upsert({ store_id: storeId, ...settings, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Chat da Live
  async getLiveChatMessages(liveId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_chat_messages')
      .select('*')
      .eq('live_id', liveId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Inscritos / Leads da Live
  async getLiveSubscribers(liveId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_subscribers')
      .select('*')
      .eq('live_id', liveId);
    if (error) throw error;
    return data || [];
  },

  // Obter catálogo de produtos da loja (Core/public)
  async getStoreProducts(storeId: string) {
    const { data, error } = await supabasePublic
      .from('products')
      .select('id, name, price, promotional_price, image_url, permalink')
      .eq('store_id', storeId)
      .order('name');
    if (error) throw error;
    return data || [];
  }
};
