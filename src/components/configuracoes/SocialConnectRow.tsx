import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Link2, Loader2, Unlink } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { disconnectIntegration, getSocialIntegration, type SocialIntegration } from '@/services/socialIntegrationsService';

interface Props {
  storeId: string;
  platform: 'instagram' | 'tiktok';
  label: string;
  icon: ReactNode;
  iconClassName: string;
  prepare?: () => void;
  getAuthUrl: () => Promise<string>;
  className?: string;
}

const BTN = 'inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50';

export default function SocialConnectRow({ storeId, platform, label, icon, iconClassName, prepare, getAuthUrl, className }: Props) {
  const [item, setItem] = useState<SocialIntegration | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const timer = useRef<number | null>(null);
  const popup = useRef<Window | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try { setItem(await getSocialIntegration(storeId, platform)); } catch { setItem(null); } finally { setLoading(false); }
  }, [storeId, platform]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const stopWait = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setWaiting(false);
    try { popup.current?.close(); } catch { /* ignora */ }
    popup.current = null;
  }, []);

  const connect = async () => {
    if (!storeId || waiting || busy) return;
    const baseline = item?.updated_at ?? null;
    prepare?.();
    // O popup abre no clique (evita bloqueio) e recebe a URL em seguida
    const w = window.open('', 'sll_social_connect', 'width=520,height=760,left=200,top=60');
    if (!w) { showError('O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo.'); return; }
    popup.current = w;
    setBusy(true);
    try {
      w.location.href = await getAuthUrl();
    } catch (e) {
      try { w.close(); } catch { /* ignora */ }
      popup.current = null;
      setBusy(false);
      showError((e as Error).message);
      return;
    }
    setBusy(false);
    setWaiting(true);
    const started = Date.now();
    timer.current = window.setInterval(async () => {
      try {
        const cur = await getSocialIntegration(storeId, platform);
        if (cur && cur.status !== 'expired' && cur.updated_at !== baseline) {
          stopWait();
          setItem(cur);
          showSuccess(`${label} conectado.`);
          return;
        }
      } catch { /* tenta de novo */ }
      if (Date.now() - started > 5 * 60 * 1000) stopWait();
    }, 2000);
  };

  const disconnect = async () => {
    if (!item || !window.confirm(`Desconectar o ${label} desta loja?`)) return;
    setBusy(true);
    try {
      await disconnectIntegration(item.id);
      setItem(null);
      showSuccess(`${label} desconectado.`);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const expired = item?.status === 'expired';
  const wrapper = className ?? 'border-t border-slate-100 dark:border-slate-800 pt-5';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${wrapper}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${iconClassName}`}>{icon}</div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
          {loading ? (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          ) : item && !expired ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 size={13} /> Conectado{item.account_username ? ` · @${item.account_username}` : ''}
            </span>
          ) : expired ? (
            <span className="text-[11px] font-bold text-rose-600">Sessão expirada · reconecte</span>
          ) : (
            <span className="text-[11px] font-bold text-amber-600">Não conectado</span>
          )}
        </div>
      </div>

      {waiting ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><Loader2 size={14} className="animate-spin" /> Aguardando conexão...</span>
          <button type="button" onClick={stopWait} className="cursor-pointer text-[11px] text-slate-400 underline hover:text-slate-600">Cancelar</button>
        </div>
      ) : item ? (
        <div className="flex items-center gap-2">
          <button type="button" disabled={busy} onClick={connect} className={`${BTN} border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200`}>
            <Link2 size={14} /> Reconectar
          </button>
          <button type="button" disabled={busy} onClick={disconnect} className={`${BTN} border border-rose-200 text-rose-600 hover:bg-rose-50`}>
            <Unlink size={14} /> Desconectar
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy || loading} onClick={connect} className={`${BTN} bg-[#0094eb] text-white`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Conectar {label}
        </button>
      )}
    </div>
  );
}