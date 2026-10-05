import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Link2, Loader2, RefreshCw, Repeat, X } from 'lucide-react';
import { getYampiStatus, saveYampiCredentials } from '@/services/yampiService';
import { getYampiSyncInfo, registerYampiWebhook, syncYampi, type SyncInfo } from '@/services/yampiSyncService';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { errMsg, ghostBtn, inputCls, labelCls } from '@/components/products/Modal';

type Props = {
  storeId: string;
  platform: string;
  platforms: string[];
  onChangePlatform: (p: string) => void;
};

const SUPPORTED = ['yampi'];

const keyOf = (p: string) =>
  p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export default function PlatformConnectCard({ storeId, platform, platforms, onChangePlatform }: Props) {
  const key = keyOf(platform || '');
  const supported = SUPPORTED.includes(key);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [alias, setAlias] = useState('');
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoIdx, setLogoIdx] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [info, setInfo] = useState<SyncInfo | null>(null);

  useEffect(() => { setLogoIdx(0); }, [key]);

  useEffect(() => {
    let alive = true;
    setConnected(false);
    if (storeId && key === 'yampi') {
      setChecking(true);
      getYampiStatus(storeId)
        .then((s) => { if (!alive) return; setConnected(!!s.connected); if (s.alias) setAlias(s.alias); if (s.connected) getYampiSyncInfo(storeId).then((i) => { if (alive) setInfo(i); }).catch(() => { /* sem info */ }); })
        .catch(() => { /* sem conexao salva */ })
        .finally(() => { if (alive) setChecking(false); });
    }
    return () => { alive = false; };
  }, [storeId, key]);

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
      registerYampiWebhook(storeId).then((r) => setInfo((i) => ({ last_sync_at: i?.last_sync_at ?? null, webhook_status: r.status }))).catch(() => { /* cron cobre */ });
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

  const logos = [`/assets/platforms/${key}.svg`, `/assets/platforms/${key}.png`];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f35]/80 shadow-sm p-6 sm:p-8 space-y-5">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">2. Plataforma de E-commerce</h2>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          Conecte sua loja para importar produtos, variações e manter estoque e preços sincronizados.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-40 items-center justify-center rounded-xl border border-slate-200 bg-white px-3">
            {key && logoIdx < logos.length ? (
              <img src={logos[logoIdx]} alt={platform} onError={() => setLogoIdx((i) => i + 1)} className="h-10 w-auto max-w-full object-contain" />
            ) : (
              <span className="text-sm font-black text-slate-700">{platform || 'Selecione'}</span>
            )}
          </div>
          <div>
            {checking ? (
              <Loader2 size={16} className="animate-spin text-slate-400" />
            ) : !platform ? (
              <span className="text-xs font-semibold text-slate-400">Selecione sua plataforma</span>
            ) : !supported ? (
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-500">
                {key === 'outra' ? 'Importe por XML ou planilha' : 'Integração em breve'}
              </span>
            ) : connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 size={13} /> Conectado{alias ? ` · ${alias}` : ''}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 dark:bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-600">Não conectado</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {supported && connected && (
            <button type="button" onClick={doSync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl border border-[#0094eb] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0094eb] hover:bg-[#0094eb]/10 disabled:opacity-50 cursor-pointer">
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sincronizar agora
            </button>
          )}
          {supported && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-[#0082cf] cursor-pointer"
            >
              <Link2 size={14} /> {connected ? 'Atualizar credenciais' : 'Conectar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setChanging((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
          >
            <Repeat size={14} /> Alterar plataforma
          </button>
        </div>
      </div>

      {supported && connected && info && (
        <p className="text-[11px] text-slate-400">
          {info.last_sync_at ? `Última sincronização: ${new Date(info.last_sync_at).toLocaleString('pt-BR')}` : 'Ainda não sincronizado.'}
          {' · '}
          {info.webhook_status === 'ok' ? 'Tempo real ativo' : info.webhook_status ? 'Tempo real indisponível (confere a cada 30 min)' : 'Tempo real não configurado'}
        </p>
      )}

      {changing && (
        <div className="space-y-2">
          <select
            value={platform}
            onChange={(e) => { onChangePlatform(e.target.value); setChanging(false); }}
            className="w-full md:w-72 px-4 py-2.5 bg-slate-50 dark:bg-[#111524] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
          >
            <option value="">Selecione...</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <p className="text-[10px] text-slate-400">Clique em "Salvar Configurações" para gravar a troca.</p>
        </div>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white dark:bg-[#1a1f35] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Conectar Yampi</h3>
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