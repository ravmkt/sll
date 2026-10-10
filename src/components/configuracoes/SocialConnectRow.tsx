import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Link2, Loader2, Unlink } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { disconnectIntegration, getSocialIntegration, type SocialIntegration } from '@/services/socialIntegrationsService';

interface Props {
  storeId: string;
  platform: 'instagram' | 'tiktok';
  label: string;
  logoSrc: string;
  prepare?: () => void;
  getAuthUrl: () => Promise<string>;
  className?: string;
}

const BTN = 'inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50';

// Corta as margens vazias do PNG para que todos os logos tenham o mesmo tamanho visual
function TrimmedLogo({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState(src);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
        let x0 = width, y0 = height, x1 = -1, y1 = -1;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const white = data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245;
            if (data[i + 3] > 20 && !white) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) return;
        const w = x1 - x0 + 1;
        const h = y1 - y0 + 1;
        const o = document.createElement('canvas');
        o.width = w;
        o.height = h;
        o.getContext('2d')?.drawImage(c, x0, y0, w, h, 0, 0, w, h);
        if (alive) setUrl(o.toDataURL('image/png'));
      } catch { /* mantém o original */ }
    };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return <img src={url} alt={alt} className="h-10 w-auto max-w-[11rem] object-contain object-left" />;
}

export default function SocialConnectRow({ storeId, platform, label, logoSrc, prepare, getAuthUrl, className }: Props) {
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
    localStorage.setItem('sll_social_popup', String(Date.now()));
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
      <div className="flex flex-col items-start gap-1.5">
        <TrimmedLogo src={logoSrc} alt={label} />
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
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Conectar
        </button>
      )}
    </div>
  );
}