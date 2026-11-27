import { useCallback, useEffect, useState } from 'react';

const MANUAL_KEY = 'sll-pdv-manual-offline';
export const NET_EVENT = 'sll-pdv-net-changed';

const BASE: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://flivmllysdhaydhogmhg.supabase.co';

const PROBE_EVERY_MS = 20_000;
const PROBE_TIMEOUT_MS = 3_000;
const FAILS_TO_DOWN = 2;
export const SALE_TIMEOUT_MS = 8_000;

let manual = (() => {
  try { return localStorage.getItem(MANUAL_KEY) === '1'; } catch { return false; }
})();
let down = false;
let fails = 0;

const emit = () => window.dispatchEvent(new Event(NET_EVENT));

/** Contingencia = o PDV deve tratar a rede como indisponivel. */
export function isContingency(): boolean {
  return manual || down || !navigator.onLine;
}

export function isManualOffline(): boolean {
  return manual;
}

export function setManualOffline(v: boolean): void {
  manual = v;
  try { localStorage.setItem(MANUAL_KEY, v ? '1' : '0'); } catch { /* ignora */ }
  emit();
}

/** Rejeita se a promessa demorar mais que `ms`. A requisicao original pode ainda chegar ao servidor. */
export function withTimeout<T>(p: Promise<T>, ms = SALE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('PDV_TIMEOUT')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Falha de rede/timeout (pode enfileirar). Erro de regra do servidor (saldo, permissao...) NAO e rede. */
export function isNetworkFailure(e: unknown): boolean {
  if (!navigator.onLine) return true;
  if (e instanceof TypeError) return true;
  const msg = String((e as { message?: unknown })?.message ?? e ?? '');
  return /failed to fetch|networkerror|network request failed|load failed|PDV_TIMEOUT|timeout|timed out|abort/i.test(msg);
}

/** Testa se o servidor responde. Qualquer resposta HTTP conta como "no ar". */
export async function probeNow(): Promise<boolean> {
  if (!navigator.onLine) {
    if (!down) { down = true; emit(); }
    return false;
  }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${BASE}/auth/v1/health`, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: ctl.signal });
    fails = 0;
    if (down) { down = false; emit(); }
    return true;
  } catch {
    fails += 1;
    if (fails >= FAILS_TO_DOWN && !down) { down = true; emit(); }
    return !down;
  } finally {
    clearTimeout(t);
  }
}

/** Registra uma falha vinda de uma chamada real (venda) para antecipar a contingencia. */
export function reportNetworkFailure(): void {
  fails = FAILS_TO_DOWN;
  if (!down) { down = true; emit(); }
}

let users = 0;
let timer: number | undefined;

function startProbing() {
  if (users++ > 0) return;
  void probeNow();
  timer = window.setInterval(() => { void probeNow(); }, PROBE_EVERY_MS);
}

function stopProbing() {
  if (--users > 0) return;
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}

export interface PdvNetState {
  /** true = usar fila (manual, sem internet ou servidor fora do ar) */
  contingency: boolean;
  manual: boolean;
  /** true = sem internet ou servidor fora do ar, independente do botao manual */
  down: boolean;
  setManual: (v: boolean) => void;
  check: () => Promise<boolean>;
}

export function usePdvNet(): PdvNetState {
  const read = () => ({ contingency: isContingency(), manual, down: down || !navigator.onLine });
  const [s, setS] = useState(read);

  useEffect(() => {
    const upd = () => setS(read());
    window.addEventListener(NET_EVENT, upd);
    window.addEventListener('online', () => { void probeNow().then(upd); });
    window.addEventListener('offline', upd);
    startProbing();
    upd();
    return () => {
      window.removeEventListener(NET_EVENT, upd);
      window.removeEventListener('offline', upd);
      stopProbing();
    };
  }, []);

  const setManual = useCallback((v: boolean) => setManualOffline(v), []);
  const check = useCallback(() => probeNow(), []);
  return { ...s, setManual, check };
}