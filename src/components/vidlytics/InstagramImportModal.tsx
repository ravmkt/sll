import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, Loader2, X } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { getSocialIntegration, type SocialIntegration } from '@/services/socialIntegrationsService';
import { fetchInstagramVideos, importInstagramVideo, type InstagramVideo } from '@/services/instagramMediaService';

function VideosPanel({ storeId }: { storeId: string }) {
  const [videos, setVideos] = useState<InstagramVideo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());

  const load = useCallback(async (next?: string | null) => {
    setLoading(true);
    try {
      const r = await fetchInstagramVideos(storeId, next);
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

  const handleImport = async (v: InstagramVideo) => {
    setImporting(v.id);
    try {
      const r = await importInstagramVideo(storeId, v.id);
      setImported((prev) => new Set(prev).add(v.id));
      showSuccess(r.duplicate ? 'Este vídeo já estava na sua biblioteca.' : 'Vídeo importado para a Biblioteca!');
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 dark:text-white">Vídeos da sua conta do Instagram</h3>
        <span className="text-xs font-bold text-slate-500">{videos.length} carregados</span>
      </div>

      {loading && videos.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
      ) : videos.length === 0 ? (
        <p className="text-xs font-bold text-slate-500">Nenhum vídeo encontrado nesta conta.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {videos.map((v) => {
            const done = imported.has(v.id);
            const busy = importing === v.id;
            return (
              <div key={v.id} className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900">
                {v.thumbnail_url && (
                  <img src={v.thumbnail_url} alt={v.caption || 'Vídeo do Instagram'} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/90 to-transparent p-2">
                  <p className="line-clamp-2 text-[10px] font-bold text-white">
                    {v.timestamp ? new Date(v.timestamp).toLocaleDateString('pt-BR') : ''}{v.caption ? ` · ${v.caption}` : ''}
                  </p>
                  <button
                    type="button"
                    disabled={busy || done}
                    onClick={() => handleImport(v)}
                    className={`flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-black text-white cursor-pointer disabled:cursor-default ${done ? 'bg-emerald-600' : 'bg-[#0094eb]'}`}
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : done ? <Check size={12} /> : <Download size={12} />}
                    {done ? 'Importado' : busy ? 'Importando...' : 'Importar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button type="button" disabled={loading} onClick={() => load(cursor)} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 cursor-pointer disabled:opacity-50">
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}

export default function InstagramImportModal({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [integration, setIntegration] = useState<SocialIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSocialIntegration(storeId, 'instagram')
      .then((i) => { if (alive) setIntegration(i); })
      .catch(() => { if (alive) setIntegration(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1f35]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">Importar do Instagram</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
          ) : integration && integration.status !== 'expired' ? (
            <VideosPanel storeId={storeId} />
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {integration ? 'Sessão do Instagram expirada.' : 'Instagram não conectado.'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Conecte sua conta em Configurações para importar vídeos.</p>
              <Link to="/dashboard/settings" onClick={onClose} className="mt-4 inline-block rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-black uppercase tracking-wider text-white">
                Ir para Configurações
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}