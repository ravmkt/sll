import type { Session } from '@supabase/supabase-js';

export const OFFLINE_PREFIX = 'sll-offline:';
export const OFFLINE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const AUTH_KEY = 'sll-hub-auth';

export function cacheSet(key: string, value: unknown): void {
  try { localStorage.setItem(OFFLINE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value })); }
  catch { /* sem espaco: segue sem cache */ }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(OFFLINE_PREFIX + key);
    if (!raw) return null;
    const o = JSON.parse(raw) as { t: number; v: T };
    if (!o || Date.now() - o.t > OFFLINE_TTL_MS) return null;
    return o.v;
  } catch { return null; }
}

/** Apaga todo o cache offline (logout). */
export function clearOfflineCache(): void {
  try {
    const rm: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(OFFLINE_PREFIX)) rm.push(k);
    }
    rm.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignora */ }
}

/** Sessao guardada pelo supabase-js, lida direto do navegador (so para uso sem internet). */
export function storedSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.user?.id && s?.access_token ? (s as Session) : null;
  } catch { return null; }
}