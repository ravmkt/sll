import { supabase } from '@/lib/supabase';

export type InstagramVideo = {
  id: string;
  caption: string;
  thumbnail_url: string;
  permalink: string;
  timestamp: string;
  product_type: string;
};

export async function fetchInstagramVideos(storeId: string, cursor?: string | null) {
  const { data, error } = await supabase.functions.invoke('get-instagram-media', { body: { storeId, cursor } });
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'Erro ao buscar vídeos do Instagram.');
  return {
    videos: (data.videos ?? []) as InstagramVideo[],
    cursor: (data.cursor ?? null) as string | null,
    hasMore: !!data.has_more,
  };
}

export async function importInstagramVideo(storeId: string, mediaId: string) {
  const { data, error } = await supabase.functions.invoke('import-instagram-video', { body: { storeId, mediaId } });
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'Erro ao importar vídeo.');
  return { videoId: data.videoId as string, duplicate: !!data.duplicate };
}