import { supabase } from '@/lib/supabase';

export type TikTokVideo = {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  embed_link?: string;
  share_url?: string;
  duration?: number;
  create_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

export async function fetchTikTokVideos(storeId: string, cursor?: number | null) {
  const { data, error } = await supabase.functions.invoke('get-tiktok-media', { body: { storeId, cursor } });
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'Erro ao buscar vídeos do TikTok.');
  return {
    videos: (data.videos ?? []) as TikTokVideo[],
    cursor: (data.cursor ?? null) as number | null,
    hasMore: !!data.has_more,
  };
}
