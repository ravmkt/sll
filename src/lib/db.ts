import { supabase } from './supabase';

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isValidUuid = (value: unknown): value is string => {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

export interface Store {
  id: string;
  name: string;
  url?: string;
  active: boolean;
  platform?: string;
  owner_user_id?: string;
  plan_id?: string;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_ends_at?: string | null;
  referred_by_store_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoreSettings {
  id: string;
  store_id: string;
  store_name: string;
  store_url?: string;
  contact_email?: string;
  app_enabled?: boolean;
  stories_enabled?: boolean;
  carousel_enabled?: boolean;
  floating_widget_enabled?: boolean;
  widget_enabled?: boolean;
  open_product_new_tab?: boolean;
  autoplay?: boolean;
  muted_by_default?: boolean;
  show_video_controls?: boolean;
  timezone?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UsageCounter {
  id: string;
  store_id: string;
  month: string;
  videos_count: number;
  views_count: number;
  users_count: number;
  created_at?: string;
  updated_at?: string;
}

const createCrud = <T extends { id: string; store_id?: string }>(tableName: string) => ({
  async getAll(storeId?: string): Promise<T[]> {
    let query = supabase.from(tableName).select('*');
    if (storeId) query = query.eq('store_id', storeId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error(`Erro ao buscar ${tableName}:`, error);
      return [];
    }
    return (data || []) as T[];
  },

  async getById(id: string): Promise<T | null> {
    if (!isValidUuid(id)) return null;
    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error(`Erro ao buscar ${tableName} por id:`, error);
      return null;
    }
    return (data as T) || null;
  },

  async save(item: T): Promise<T> {
    const now = new Date().toISOString();
    const payload = { ...item, updated_at: now, created_at: (item as any).created_at || now };

    const idIsValid = isValidUuid(item.id);

    if (idIsValid) {
      const { data: existing } = await supabase.from(tableName).select('id').eq('id', item.id).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from(tableName).update(payload).eq('id', item.id).select().single();
        if (error) throw error;
        return data as T;
      }
    }

    const { data, error } = await supabase.from(tableName).insert(payload).select().single();
    if (error) throw error;
    return data as T;
  },

  async delete(id: string): Promise<boolean> {
    if (!isValidUuid(id)) return true;
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
});

export const resolveStoreId = async (storeId?: string | null): Promise<string> => {
  if (storeId && isValidUuid(storeId)) return storeId;

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw new Error('Usuário não autenticado.');

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (store?.id) return store.id;

  throw new Error('Nenhuma loja encontrada para o usuário atual.');
};

export const db = {
  stores: createCrud<Store>('stores'),
  storeSettings: createCrud<StoreSettings>('store_settings'),
  usageCounters: createCrud<UsageCounter>('usage_counters'),
  resolveStoreId,
};
