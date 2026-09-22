import { supabasePublic } from './supabaseClients';

export const SLLDatabaseService = {
  // Lojas / Tenants
  async getStores() {
    const { data, error } = await supabasePublic
      .from('stores')
      .select('*');
    if (error) throw error;
    return data;
  },

  async getStoreById(storeId: string) {
    const { data, error } = await supabasePublic
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();
    if (error) throw error;
    return data;
  },

  // Catálogo de Produtos Global
  async getProducts(storeId: string) {
    const { data, error } = await supabasePublic
      .from('products')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Subscrições e Módulos Ativos do Lojista
  async getSubscriptions(storeId: string) {
    const { data, error } = await supabasePublic
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  },

  // Configurações do Google Tag Manager
  async getGtmSettings(storeId: string) {
    const { data, error } = await supabasePublic
      .from('store_integrations')
      .select('*')
      .eq('store_id', storeId);
    if (error) throw error;
    return data;
  }
};
