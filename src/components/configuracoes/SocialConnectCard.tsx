import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Link2, Loader2, Unlink } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  disconnectIntegration,
  getSocialIntegration,
  startTikTokConnect,
  type SocialIntegration,
} from '@/services/socialIntegrationsService';

const TikTokIcon = () => (
  <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.31 2.56.02.83.42 1.63 1.05 2.15.82.68 1.97.87 2.97.58.98-.28 1.83-1.07 2.13-2.05.17-.63.19-1.29.18-1.94V.02z" />
  </svg>
);

export default function SocialConnectCard({ storeId }: { storeId: string }) {
  const [tiktok, setTiktok] = useState<SocialIntegration | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      setTiktok(await getSocialIntegration(storeId, 'tiktok'));
    } catch {
      setTiktok(null);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('tiktok');
    if (!status) return;
    if (status === 'connected') showSuccess('TikTok conectado com sucesso!');
    else showError(params.get('message') || 'Falha ao conectar o TikTok.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      await startTikTokConnect(storeId);
    } catch (e) {
      showError((e as Error).message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!tiktok || !window.confirm('Desconectar o TikTok desta loja?')) return;
    setBusy(true);
    try {
      await disconnectIntegration(tiktok.id);
      setTiktok(null);
      showSuccess('TikTok desconectado.');
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f35]/80 shadow-sm p-6 sm:p-8 space-y-5">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Redes Sociais</h2>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          Conecte suas contas para importar vídeos e usar nos módulos contratados.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-black text-white">
            {tiktok?.avatar_url ? <img src={tiktok.avatar_url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <TikTokIcon />}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">TikTok</p>
            {loading ? (
              <Loader2 size={14} className="animate-spin text-slate-400" />
            ) : tiktok ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 size={13} /> Conectado{tiktok.account_username ? ` · @${tiktok.account_username}` : ''}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-600">Não conectado</span>
            )}
          </div>
        </div>

        {tiktok ? (
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy} onClick={connect} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 cursor-pointer">
              <Link2 size={14} /> Reconectar
            </button>
            <button type="button" disabled={busy} onClick={disconnect} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
              <Unlink size={14} /> Desconectar
            </button>
          </div>
        ) : (
          <button type="button" disabled={busy || loading} onClick={connect} className="inline-flex items-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-[#0082cf] disabled:opacity-50 cursor-pointer">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Conectar TikTok
          </button>
        )}
      </div>

      {tiktok?.profile?.follower_count !== undefined && (
        <p className="text-[11px] text-slate-400">
          {Number(tiktok.profile.follower_count).toLocaleString('pt-BR')} seguidores · {Number(tiktok.profile.video_count ?? 0).toLocaleString('pt-BR')} vídeos
        </p>
      )}
    </div>
  );
}
