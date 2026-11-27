import { useCallback, useEffect, useRef, useState } from 'react';
import { QUEUE_EVENT, listQueue, markOnline, offlineBlocked, registerPdvSw, syncQueue } from '../services/pdvOffline';
import type { SyncSummary } from '../services/pdvOffline';
import { isContingency, isManualOffline, probeNow, usePdvNet } from '../services/pdvNet';
import { showError, showSuccess } from '@/utils/toast';

/** Disparado depois que vendas da fila foram enviadas (a PdvPage recarrega catalogo e estoque). */
export const SYNCED_EVENT = 'sll-pdv-synced';

// Trava global: varias telas usando o hook nao disparam envios ao mesmo tempo
let inflight: Promise<SyncSummary | null> | null = null;

function announce(s: SyncSummary) {
  if (s.sales.length > 0) {
    const lines = s.sales.map((x) => {
      const n = Number(x.result?.number ?? 0);
      const ref = x.provisional ?? 'Venda';
      return n > 0 ? `${ref} → pedido #${String(n).padStart(4, '0')}` : `${ref} enviada`;
    });
    const shown = lines.slice(0, 3).join('; ');
    const extra = lines.length > 3 ? ` e mais ${lines.length - 3}` : '';
    showSuccess(`${lines.length === 1 ? 'Venda enviada' : lines.length + ' vendas enviadas'}: ${shown}${extra}.`);
  }
  if (s.failed > 0) {
    showError(`${s.failed} item(ns) da fila deu erro. Veja o aviso na faixa do PDV.`);
  }
}

export function usePdvOffline() {
  const net = usePdvNet();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expired, setExpired] = useState(false);

  const online = !net.contingency;
  const canSync = navigator.onLine && !net.manual;

  const refresh = useCallback(async () => {
    const q = await listQueue();
    const errs = q.filter((i) => i.status === 'error');
    setPending(q.filter((i) => i.status === 'pending').length);
    setFailed(errs.length);
    setLastError(errs.length ? (errs[errs.length - 1].error ?? 'Erro ao enviar') : null);
    setExpired(offlineBlocked());
  }, []);

  /** force = botao Sincronizar (ignora so a deteccao automatica de queda; nunca o modo manual). */
  const sync = useCallback(async (force = false): Promise<SyncSummary | null> => {
    if (isManualOffline() || !navigator.onLine) return null;
    if (!force && isContingency()) return null;
    if (inflight) return inflight;
    setSyncing(true);
    const run = (async () => {
      try {
        const s = await syncQueue();
        if (s.done > 0 && !s.offline) {
          void probeNow();
          window.dispatchEvent(new Event(SYNCED_EVENT));
        }
        announce(s);
        return s;
      } finally {
        inflight = null;
      }
    })();
    inflight = run;
    try { return await run; }
    finally { setSyncing(false); await refresh(); }
  }, [refresh]);

  // saiu da contingencia (rede voltou, servidor voltou ou "Voltar ao online"): envia a fila
  const wasCont = useRef(net.contingency);
  useEffect(() => {
    if (wasCont.current && !net.contingency) { markOnline(); void sync(); }
    wasCont.current = net.contingency;
    void refresh();
  }, [net.contingency, sync, refresh]);

  useEffect(() => {
    registerPdvSw();
    const goOnline = () => { if (!isContingency()) markOnline(); void sync(); };
    const goOffline = () => { void refresh(); };
    const goVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener(QUEUE_EVENT, refresh);
    document.addEventListener('visibilitychange', goVisible);
    if (!isContingency()) { markOnline(); void sync(); } else { void refresh(); }
    const t = window.setInterval(() => {
      if (!isContingency()) { markOnline(); void sync(); } else { void refresh(); }
    }, 60000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener(QUEUE_EVENT, refresh);
      document.removeEventListener('visibilitychange', goVisible);
      window.clearInterval(t);
    };
  }, [sync, refresh]);

  return { online, canSync, pending, failed, lastError, syncing, expired, blocked: expired, sync };
}