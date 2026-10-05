import { supabase } from '@/lib/supabase';

export type SocialIntegration = {
  id: string;
  platform: string;
  account_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  scopes: string[];
  status: string;
  profile: Record<string, any>;
  updated_at: string;
};

export async function startTikTokConnect(storeId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('tiktok-oauth-start', { body: { storeId } });
  if (error || !data?.url) throw new Error(data?.error || error?.message || 'Não foi possível iniciar a conexão com o TikTok.');
  window.location.href = data.url;
}

export async function getSocialIntegration(storeId: string, platform: string): Promise<SocialIntegration | null> {
  const { data, error } = await supabase
    .from('store_integrations')
    .select('id, platform, account_username, display_name, avatar_url, scopes, status, profile, updated_at')
    .eq('store_id', storeId)
    .eq('platform', platform)
    .maybeSingle();
  if (error) throw error;
  return (data as SocialIntegration) ?? null;
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  const { error } = await supabase.from('store_integrations').delete().eq('id', integrationId);
  if (error) throw error;
}
