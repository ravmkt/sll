import { supabaseLiveCommerce } from './supabaseClients';

export const LiveCommerceDatabaseService = {
  // Lives Agendadas ou Ao Vivo
  async getLives(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_lives')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Configurações da Live
  async getLiveSettings(storeId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_settings')
      .select('*')
      .eq('store_id', storeId);
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
    return data;
  },

  // Cupons da Live
  async getLiveCoupons(liveId: string) {
    const { data, error } = await supabaseLiveCommerce
      .from('live_coupons')
      .select('*')
      .eq('live_id', liveId);
    if (error) throw error;
    return data;
  }
};
