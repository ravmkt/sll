import { useCallback, useEffect, useState } from 'react';
import { QUEUE_EVENT, listQueue, markOnline, offlineBlocked, registerPdvSw, syncQueue } from '../services/pdvOffline';
import type { SyncSummary } from '../services/pdvOffline';

// Trava global: varias telas usando o hook nao disparam envios ao mesmo tempo
let inflight: Promise<SyncSummary | null> | null = null;

export function usePdvOffline() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expired, setExpired] = useState(false);

  const refresh = useCallback(async () => {
    const q = await listQueue();
    const errs = q.filter((i) => i.status === 'error');
    setPending(q.filter((i) => i.status === 'pending').length);
    setFailed(errs.length);
    setLastError(errs.length ? (errs[errs.length - 1].error ?? 'Erro ao enviar') : null);
    setExpired(offlineBlocked());
  }, []);

  const sync = useCallback(async (): Promise<SyncSummary | null> => {
    if (!navigator.onLine) return null;
    if (inflight) return inflight;
    setSyncing(true);
    const run = (async () => {
      try { return await syncQueue(); }
      finally { inflight = null; }
    })();
    inflight = run;
    try { return await run; }
    finally { setSyncing(false); await refresh(); }
  }, [refresh]);

  useEffect(() => {
    registerPdvSw();
    const goOnline = () => { setOnline(true); markOnline(); void sync(); };
    const goOffline = () => { setOnline(false); void refresh(); };
    const goVisible = () => { if (document.visibilityState === 'visible' && navigator.onLine) void sync(); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener(QUEUE_EVENT, refresh);
    document.addEventListener('visibilitychange', goVisible);
    if (navigator.onLine) { markOnline(); void sync(); } else { void refresh(); }
    const t = window.setInterval(() => {
      if (navigator.onLine) { markOnline(); void sync(); } else { void refresh(); }
    }, 60000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener(QUEUE_EVENT, refresh);
      document.removeEventListener('visibilitychange', goVisible);
      window.clearInterval(t);
    };
  }, [sync, refresh]);

  return { online, pending, failed, lastError, syncing, expired, blocked: expired, sync };
}