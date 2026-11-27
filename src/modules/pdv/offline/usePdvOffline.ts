import { useCallback, useEffect, useRef, useState } from 'react';
import {
  enqueue as enqueueItem, listQueue, removeItem, markFailed,
  touchOnline, isOfflineExpired, type QueueItem, type QueueKind,
} from './db';

/**
 * send(item): envia UM item ao servidor e lanca erro se falhar.
 * A fila e processada em ordem; no primeiro erro ela para e tenta de novo depois.
 */
export function usePdvOffline(send: (item: QueueItem) => Promise<void>) {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [expired, setExpired] = useState<boolean>(isOfflineExpired());
  const busy = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;

  const refresh = useCallback(async () => {
    setPending((await listQueue()).length);
  }, []);

  const sync = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    busy.current = true;
    setSyncing(true);
    let failed = false;
    try {
      for (const it of await listQueue()) {
        try {
          await sendRef.current(it);
          await removeItem(it.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await markFailed(it.id, msg);
          setLastError(msg);
          failed = true;
          break;
        }
      }
      if (!failed) setLastError(null);
    } finally {
      busy.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  const enqueue = useCallback(async (kind: QueueKind, payload: unknown) => {
    const item = await enqueueItem(kind, payload);
    await refresh();
    void sync();
    return item;
  }, [refresh, sync]);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/pdv-sw.js').catch(() => undefined);
    }
    if (navigator.onLine) touchOnline();
    void refresh();
    void sync();

    const goOnline = () => { setOnline(true); touchOnline(); setExpired(false); void sync(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const timer = window.setInterval(() => {
      if (navigator.onLine) touchOnline();
      setExpired(isOfflineExpired());
      void sync();
    }, 30000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.clearInterval(timer);
    };
  }, [refresh, sync]);

  return { online, pending, syncing, lastError, expired, sync, enqueue };
}