import { supabase } from '@/lib/supabase';

export interface TikTokVideo {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  embed_url?: string;
  share_url?: string;
}

/**
 * Busca os vídeos do perfil do TikTok conectado via Edge Function
 */
export const fetchTikTokMedia = async (storeId: string): Promise<TikTokVideo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-tiktok-media', {
      body: { storeId },
    });

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || 'Erro ao buscar vídeos do TikTok');
    }

    return (data.videos || []) as TikTokVideo[];
  } catch (error) {
    console.error('Erro no serviço fetchTikTokMedia:', error);
    throw error;
  }
};
