import { supabase } from '@/lib/supabase';

export interface StorePayload {
  name: string;
  url: string;
  platform: string;
  contact_email: string;
  contact_name: string;
  owner_contact_email: string;
  whatsapp_number: string;
  whatsapp_message_template: string;
  logo_url?: string | null;
  sector_id?: string | null;
}

export const SLLDatabaseService = {
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

  // Criação inicial da loja e provisionamento completo de store_settings
  async createInitialStore(userId: string, payload: StorePayload) {
    const slug = payload.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const nowIso = new Date().toISOString();

    // 1. Inserir em public.stores
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        owner_user_id: userId,
        name: payload.name.trim(),
        url: payload.url.trim(),
        platform: payload.platform,
        contact_email: payload.contact_email.trim(),
        contact_name: payload.contact_name.trim(),
        owner_contact_email: payload.owner_contact_email.trim(),
        logo_url: payload.logo_url || null,
        sector_id: payload.sector_id || null,
        slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
        active: true,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (storeError || !store) {
      console.error('Erro ao criar loja em public.stores:', storeError);
      throw storeError || new Error('Falha ao inserir loja');
    }

    // E-mail de boas-vindas (não bloqueia o cadastro)
    supabase.functions
      .invoke('send-welcome-email', { body: { store_id: store.id } })
      .then(({ error }) => { if (error) console.warn('Boas-vindas não enviado:', error); })
      .catch((e) => console.warn('Boas-vindas não enviado:', e));

    // 2. Inserir em public.store_settings (fonte da verdade para todos os módulos)
    const { error: settingsError } = await supabase
      .from('store_settings')
      .insert({
        store_id: store.id,
        store_name: store.name,
        store_url: store.url,
        platform: store.platform,
        contact_email: store.contact_email,
        owner_contact_email: store.owner_contact_email,
        logo_url: store.logo_url,
        whatsapp_number: payload.whatsapp_number.trim(),
        whatsapp_message_template: payload.whatsapp_message_template.trim(),
        whatsapp_default_message: payload.whatsapp_message_template.trim(),
        whatsapp_enabled: true,
        whatsapp_button_enabled: true,
        app_enabled: true,
        stories_enabled: true,
        carousel_enabled: true,
        floating_widget_enabled: true,
        widget_enabled: true,
        autoplay: true,
        muted_by_default: true,
        show_video_controls: false,
        pause_on_leave: true,
        open_product_new_tab: true,
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        default_template: 'minimalista',
        created_at: nowIso,
        updated_at: nowIso,
      });

    if (settingsError) {
      console.warn('Alerta: Erro ao provisionar store_settings:', settingsError);
    }

    return store;
  },

  // Usado pela nova SettingsPage
  async getStoreSettings(storeId: string) {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar store_settings:', error);
      throw error;
    }
    return data;
  },

  async updateStoreSettings(storeId: string, payload: Record<string, any>) {
    const { data, error } = await supabase
      .from('store_settings')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar store_settings:', error);
      throw error;
    }
    return data;
  },

  async updateStore(storeId: string, payload: Record<string, any>) {
    const { data, error } = await supabase
      .from('stores')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar stores:', error);
      throw error;
    }
    return data;
  },

  async getSectors() {
    const { data, error } = await supabase
      .from('sectors')
      .select('id, name, slug, icon')
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar setores:', error);
      throw error;
    }
    return data || [];
  },
};
