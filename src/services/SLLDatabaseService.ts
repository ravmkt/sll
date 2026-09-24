import { supabase } from '@/lib/supabase';

export interface StorePayload {
  name: string;
  url: string;
  platform: string;
  contact_email: string;
}

export const SLLDatabaseService = {
  // Chamado pelo Dashboard/Header para carregar as lojas do usuário
  async getStores(userId?: string) {
    let query = supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('owner_user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar lojas:', error);
      throw error;
    }
    return data || [];
  },

  // Retorna a loja ativa do usuário logado
  async getUserStore(userId: string) {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao consultar loja do usuário:', error);
      throw error;
    }
    return data;
  },

  // Criação inicial da loja e provisionamento de store_settings
  async createInitialStore(userId: string, payload: StorePayload) {
    const slug = payload.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // 1. Inserir em public.stores
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        owner_user_id: userId,
        name: payload.name.trim(),
        url: payload.url.trim(),
        platform: payload.platform,
        contact_email: payload.contact_email.trim(),
        slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (storeError || !store) {
      console.error('Erro ao criar loja em public.stores:', storeError);
      throw storeError || new Error('Falha ao inserir loja');
    }

    // 2. Inserir em public.store_settings
    const { error: settingsError } = await supabase
      .from('store_settings')
      .insert({
        store_id: store.id,
        store_name: store.name,
        store_url: store.url,
        contact_email: store.contact_email,
        app_enabled: true,
        stories_enabled: true,
        carousel_enabled: true,
        floating_widget_enabled: true,
        widget_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (settingsError) {
      console.warn('Alerta: Erro ao provisionar store_settings:', settingsError);
    }

    return store;
  },
};