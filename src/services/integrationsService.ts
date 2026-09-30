import { supabase } from '@/lib/supabase';

export interface StoreIntegration {
  id: string;
  store_id: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'pinterest';
  account_id?: string | null;
  account_username?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Busca todas as integrações configuradas para uma loja
 */
export const getStoreIntegrations = async (storeId: string): Promise<StoreIntegration[]> => {
  const { data, error } = await supabase
    .from('store_integrations')
    .select('*')
    .eq('store_id', storeId);

  if (error) {
    console.error('Erro ao buscar integrações da loja:', error);
    throw error;
  }

  return (data || []) as StoreIntegration[];
};

/**
 * Busca integração específica por plataforma
 */
export const getStoreIntegrationByPlatform = async (
  storeId: string,
  platform: 'instagram' | 'tiktok' | 'youtube' | 'pinterest'
): Promise<StoreIntegration | null> => {
  const { data, error } = await supabase
    .from('store_integrations')
    .select('*')
    .eq('store_id', storeId)
    .eq('platform', platform)
    .maybeSingle();

  if (error) {
    console.error(`Erro ao buscar integração ${platform}:`, error);
    throw error;
  }

  return data as StoreIntegration | null;
};

/**
 * Remove/Desconecta uma integração
 */
export const disconnectIntegration = async (
  storeId: string,
  platform: 'instagram' | 'tiktok' | 'youtube' | 'pinterest'
): Promise<boolean> => {
  const { error } = await supabase
    .from('store_integrations')
    .delete()
    .eq('store_id', storeId)
    .eq('platform', platform);

  if (error) {
    console.error(`Erro ao desconectar integração ${platform}:`, error);
    throw error;
  }

  return true;
};
