import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const INTERVAL_MS = 30 * 60 * 1000;

/** Registra o ultimo acesso do lojista (stores.last_active_at). O banco grava no maximo 1x por hora. */
export function useTouchStoreActivity() {
  useEffect(() => {
    let last = 0;
    const touch = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - last < INTERVAL_MS) return;
      last = now;
      (supabase as any).rpc('touch_store_activity').then(() => undefined, () => undefined);
    };
    touch();
    const timer = window.setInterval(touch, INTERVAL_MS);
    document.addEventListener('visibilitychange', touch);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', touch);
    };
  }, []);
}

export default useTouchStoreActivity;