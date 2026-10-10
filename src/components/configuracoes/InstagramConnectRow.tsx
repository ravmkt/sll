import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Link2, Loader2, Unlink } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { disconnectIntegration, getSocialIntegration, type SocialIntegration } from '@/services/socialIntegrationsService';

const APP_ID = '28436857449312028';

export default function InstagramConnectRow({ storeId }: { storeId: string }) {
  const [ig, setIg] = useState<SocialIntegration | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try { setIg(await getSocialIntegration(storeId, 'instagram')); } catch { setIg(null); } finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  // Abre o login do Instagram em popup; esta pagina continua onde esta
  const connect = () => {
    if (!storeId) return;
    const redirectUri = `${window.location.origin}/dashboard/integracao`;
    sessionStorage.setItem('ig_redirect_uri', redirectUri);
    sessionStorage.removeItem('ig_return');
    localStorage.setItem('sll_oauth_store_id', storeId);
    const params = new URLSearchParams({
      client_id: APP_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'instagram_business_basic',
      state: storeId,
    });
    const w = window.open(
      `https://www.instagram.com/oauth/authorize?${params.toString()}`,
      'ig_connect',
      'width=520,height=760,left=200,top=60',
    );
    if (!w) {
      showError('O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo.');
      return;
    }
    setBusy(true);
    if (timer.current) window.clearInterval(timer.current);
    const started = Date.now();
    let arrivedAt = 0;
    timer.current = window.setInterval(async () => {
      const stop = async () => {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        try { if (!w.closed) w.close(); } catch { /* ignora */ }
        await load();
        setBusy(false);
      };
      if (w.closed || Date.now() - started > 5 * 60 * 1000) { await stop(); return; }
      try {
        // So le o endereco quando o popup volta para o nosso dominio
        if (w.location.pathname.startsWith('/dashboard/integracao')) {
          if (!arrivedAt) arrivedAt = Date.now();
          if (Date.now() - arrivedAt > 5000) { await stop(); showSuccess('Instagram atualizado.'); }
        }
      } catch { /* ainda no dominio do Instagram */ }
    }, 1000);
  };

  const disconnect = async () => {
    if (!ig || !window.confirm('Desconectar o Instagram desta loja?')) return;
    setBusy(true);
    try {
      await disconnectIntegration(ig.id);
      setIg(null);
      showSuccess('Instagram desconectado.');
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const expired = ig?.status === 'expired';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">Instagram</p>
          {loading ? (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          ) : ig && !expired ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 size={13} /> Conectado{ig.account_username ? ` · @${ig.account_username}` : ''}
            </span>
          ) : expired ? (
            <span className="text-[11px] font-bold text-rose-600">Sessão expirada · reconecte</span>
          ) : (
            <span className="text-[11px] font-bold text-amber-600">Não conectado</span>
          )}
        </div>
      </div>

      {ig ? (
        <div className="flex items-center gap-2">
          <button type="button" disabled={busy} onClick={connect} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 cursor-pointer disabled:opacity-50">
            <Link2 size={14} /> Reconectar
          </button>
          <button type="button" disabled={busy} onClick={disconnect} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-50">
            <Unlink size={14} /> Desconectar
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy || loading} onClick={connect} className="inline-flex items-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-black uppercase tracking-wider text-white cursor-pointer disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Conectar Instagram
        </button>
      )}
    </div>
  );
}