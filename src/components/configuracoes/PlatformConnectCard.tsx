import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Link2, Loader2, RefreshCw, Unlink, X } from 'lucide-react';
import { disconnectYampi, getYampiStatus, saveYampiCredentials } from '@/services/yampiService';
import { getYampiSyncInfo, registerYampiWebhook, syncYampi, type SyncInfo } from '@/services/yampiSyncService';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { errMsg, ghostBtn, inputCls, labelCls } from '@/components/products/Modal';

type Props = {
  storeId: string;
  platform?: string;
  platforms?: string[];
  onChangePlatform?: (p: string) => void;
};

const LOGOS = ['/assets/platforms/yampi.svg', '/assets/platforms/yampi.png'];

export default function PlatformConnectCard({ storeId }: Props) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [alias, setAlias] = useState('');
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoIdx, setLogoIdx] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [info, setInfo] = useState<SyncInfo | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    setChecking(true);
    getYampiStatus(storeId)
      .then((s) => {
        if (!alive) return;
        setConnected(!!s.connected);
        if (s.alias) setAlias(s.alias);
        if (s.connected) getYampiSyncInfo(storeId).then((i) => { if (alive) setInfo(i); }).catch(() => { /* sem info */ });
      })
      .catch(() => { /* sem conexao salva */ })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [storeId]);

  const connect = async () => {
    if (!alias.trim() || !token.trim() || !secret.trim()) return showError('Preencha alias, User-Token e User-Secret-Key.');
    setBusy(true);
    try {
      await saveYampiCredentials(storeId, alias.trim(), token.trim(), secret.trim());
      setConnected(true);
      setOpen(false);
      setToken('');
      setSecret('');
      showSuccess('Yampi conectada.');
      registerYampiWebhook(storeId)
        .then((r) => setInfo((i) => ({ last_sync_at: i?.last_sync_at ?? null, webhook_status: r.status })))
        .catch(() => { /* cron cobre */ });
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await syncYampi(storeId);
      getYampiSyncInfo(storeId).then(setInfo).catch(() => { /* sem info */ });
      showSuccess(`Sincronizado: ${r.variants_updated} variação(ões) e ${r.prices_updated} preço(s) atualizados${r.variants_added ? `, ${r.variants_added} nova(s)` : ''}.`);
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setSyncing(false);
    }
  };

  const doDisconnect = async () => {
    if (!window.confirm('Desconectar a Yampi? A sincronização de estoque e preços será interrompida. Os produtos já importados continuam no SLL.')) return;
    setRemoving(true);
    try {
      await disconnectYampi(storeId);
      setConnected(false);
      setInfo(null);
      setAlias('');
      setToken('');
      setSecret('');
      showSuccess('Yampi desconectada.');
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f35]/80 shadow-sm p-6 sm:p-8 space-y-5">
      <div className="flex flex-col items-center gap-3">
        {logoIdx < LOGOS.length ? (
          <img src={LOGOS[logoIdx]} alt="Yampi" onError={() => setLogoIdx((i) => i + 1)} className="h-16 w-auto max-w-[240px] object-contain" />
        ) : (
          <span className="text-2xl font-black text-slate-700 dark:text-white">Yampi</span>
        )}
        {checking ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : connected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 size={13} /> Conectado{alias ? ` · ${alias}` : ''}
          </span>
        ) : null}
      </div>

      {!checking && (
        <div className="flex flex-nowrap items-center justify-center gap-2">
          {connected ? (
            <>
              <button type="button" onClick={doSync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl border border-[#0094eb] px-3 py-2 whitespace-nowrap text-xs font-black uppercase tracking-wider text-[#0094eb] hover:bg-[#0094eb]/10 disabled:opacity-50 cursor-pointer">
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sincronizar agora
              </button>
              <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#0094eb] px-3 py-2 whitespace-nowrap text-xs font-black uppercase tracking-wider text-white hover:bg-[#0082cf] cursor-pointer">
                <Link2 size={14} /> Atualizar credenciais
              </button>
              <button type="button" onClick={doDisconnect} disabled={removing} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-3 py-2 whitespace-nowrap text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer">
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />} Desconectar
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#0094eb] px-3 py-2 whitespace-nowrap text-xs font-black uppercase tracking-wider text-white hover:bg-[#0082cf] cursor-pointer">
              <Link2 size={14} /> Conectar
            </button>
          )}
        </div>
      )}

      {connected && info && (
        <p className="text-center text-[11px] text-slate-400">
          {info.last_sync_at ? `Última sincronização: ${new Date(info.last_sync_at).toLocaleString('pt-BR')}` : 'Ainda não sincronizado.'}
          {' · '}
          {info.webhook_status === 'ok' ? 'Tempo real ativo' : info.webhook_status ? 'Tempo real indisponível (confere a cada 30 min)' : 'Tempo real não configurado'}
        </p>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white dark:bg-[#1a1f35] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">{connected ? 'Atualizar credenciais' : 'Conectar Yampi'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credenciais de API geradas no painel da Yampi. Elas ficam guardadas apenas no servidor.
            </p>
            <div><label className={labelCls}>Alias da loja</label><input value={alias} onChange={(e) => setAlias(e.target.value)} className={cn(inputCls, 'mt-2')} /></div>
            <div><label className={labelCls}>User-Token</label><input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" className={cn(inputCls, 'mt-2')} /></div>
            <div>
              <label className={labelCls}>User-Secret-Key</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); connect(); } }}
                autoComplete="new-password"
                className={cn(inputCls, 'mt-2')}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className={cn(ghostBtn, 'flex-1')}>Cancelar</button>
              <button
                type="button"
                disabled={busy}
                onClick={connect}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#0082cf] disabled:opacity-50 cursor-pointer"
              >
                {busy ? <><Loader2 size={14} className="animate-spin" /> Validando...</> : 'Conectar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}