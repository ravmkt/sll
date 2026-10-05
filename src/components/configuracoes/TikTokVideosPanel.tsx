import { useCallback, useEffect, useState } from 'react';
import { Eye, Heart, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import { fetchTikTokVideos, type TikTokVideo } from '@/services/tiktokMediaService';

export default function TikTokVideosPanel({ storeId }: { storeId: string }) {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (next?: number | null) => {
    setLoading(true);
    try {
      const r = await fetchTikTokVideos(storeId, next);
      setVideos((prev) => (next ? [...prev, ...r.videos] : r.videos));
      setCursor(r.cursor);
      setHasMore(r.hasMore);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 dark:text-white">Vídeos da sua conta do TikTok</h3>
        <span className="text-xs font-bold text-slate-500">{videos.length} carregados</span>
      </div>

      {loading && videos.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
      ) : videos.length === 0 ? (
        <p className="text-xs font-bold text-slate-500">Nenhum vídeo público encontrado nesta conta.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {videos.map((v) => (
            <a
              key={v.id}
              href={v.share_url}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-[9/16] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900"
            >
              {v.cover_image_url && (
                <img src={v.cover_image_url} alt={v.title || 'Vídeo do TikTok'} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] font-bold text-white">
                <span className="inline-flex items-center gap-1"><Eye size={11} />{Number(v.view_count ?? 0).toLocaleString('pt-BR')}</span>
                <span className="inline-flex items-center gap-1"><Heart size={11} />{Number(v.like_count ?? 0).toLocaleString('pt-BR')}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {hasMore && (
        <button type="button" disabled={loading} onClick={() => load(cursor)} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 cursor-pointer">
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}
