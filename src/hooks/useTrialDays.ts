import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const FALLBACK = 14;
let cache: number | null = null;
let inflight: Promise<number> | null = null;

export function invalidateTrialDays() {
  cache = null;
  inflight = null;
}

function load(): Promise<number> {
  if (cache !== null) return Promise.resolve(cache);
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_trial_days');
        const n = Number(data);
        cache = !error && Number.isFinite(n) && n > 0 ? n : FALLBACK;
      } catch {
        cache = FALLBACK;
      }
      return cache as number;
    })();
  }
  return inflight;
}

export function useTrialDays(): number {
  const [days, setDays] = useState<number>(cache ?? FALLBACK);
  useEffect(() => {
    let alive = true;
    load().then((n) => { if (alive) setDays(n); });
    return () => { alive = false; };
  }, []);
  return days;
}