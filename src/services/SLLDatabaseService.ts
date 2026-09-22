import { supabase } from '../lib/supabase';

export interface Store {
  id: string;
  name: string;
  slug?: string;
  url?: string;
  platform?: string;
  owner_user_id: string;
  subscription_status?: string;
}

export const SLLDatabaseService = {
  /**
   * Busca todas as lojas do usuário autenticado via owner_user_id
   */
  async getUserStores(): Promise<Store[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuário não autenticado.');
    }

    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, url, platform, owner_user_id, subscription_status')
      .eq('owner_user_id', user.id);

    if (error) {
      console.error('Erro ao buscar stores:', error);
      throw error;
    }

    return (data as Store[]) || [];
  },

  /**
   * Busca a loja principal/ativa do lojista
   */
  async getActiveStore(): Promise<Store | null> {
    const stores = await this.getUserStores();
    return stores.length > 0 ? stores[0] : null;
  }
};
