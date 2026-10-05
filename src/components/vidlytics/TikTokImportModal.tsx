import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import TikTokVideosPanel from '@/components/configuracoes/TikTokVideosPanel';
import { getSocialIntegration, type SocialIntegration } from '@/services/socialIntegrationsService';

export default function TikTokImportModal({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [integration, setIntegration] = useState<SocialIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSocialIntegration(storeId, 'tiktok')
      .then((i) => { if (alive) setIntegration(i); })
      .catch(() => { if (alive) setIntegration(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1f35]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">Importar do TikTok</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
          ) : integration ? (
            <TikTokVideosPanel storeId={storeId} />
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">TikTok não conectado.</p>
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