import { supabase } from '@/lib/supabase';
import { setOrderOrigin } from './canaisVenda';
import type { SaleOrigin } from './canaisVenda';

const sb: any = supabase;

const DB_NAME = 'sll-pdv';
const DB_VERSION = 2;
const STORE = 'queue';
const CACHE = 'cache';
const LAST_ONLINE_KEY = 'sll-pdv-last-online';
export const QUEUE_EVENT = 'sll-pdv-queue-changed';
export const MAX_OFFLINE_MS = 3 * 24 * 60 * 60 * 1000;

export type QueueKind = 'sale' | 'cash_move' | 'cash_close';

export interface QueueItem {
  id: string;
  kind: QueueKind;
  params: Record<string, unknown>;
  origin?: SaleOrigin | null;
  provisional?: string | null;
  status: 'pending' | 'error';
  error?: string | null;
  createdAt: number;
}

export interface OfflineSaleInput {
  storeId: string;
  customerId?: string | null;
  items: { variant_id: string; qty: number; unit_price: number; discount?: number }[];
  discount?: number;
  shipping?: number;
  payments: { method: string; amount: number; installments?: number; cash_given?: number }[];
  sendToExpedition?: boolean;
  sellerId?: string | null;
  warehouseId?: string | null;
  note?: string | null;
  channel?: string | null;
  origin?: SaleOrigin | null;
  /** Chave de idempotencia da venda (use a mesma da tentativa online). */
  idem?: string | null;
}

export interface SyncSummary {
  done: number;
  failed: number;
  pending: number;
  offline: boolean;
  sales: { provisional: string | null; result: any }[];
}

/* ---------- IndexedDB ---------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE, { keyPath: 'key' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const rq = fn(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(rq.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

const notify = () => window.dispatchEvent(new Event(QUEUE_EVENT));

/* ---------- Cache local (catalogo, estoque, lojas, caixa aberto etc.) ---------- */

export async function saveCache<T>(key: string, value: T): Promise<void> {
  try { await run(CACHE, 'readwrite', (s) => s.put({ key, value, savedAt: Date.now() })); }
  catch (e) { console.warn('[PDV] cache nao gravado:', key, e); }
}

export async function loadCache<T>(key: string): Promise<{ value: T; savedAt: number } | null> {
  try {
    const row = await run<any>(CACHE, 'readonly', (s) => s.get(key));
    return row ? { value: row.value as T, savedAt: Number(row.savedAt) || 0 } : null;
  } catch { return null; }
}

export async function removeCache(key: string): Promise<void> {
  try { await run(CACHE, 'readwrite', (s) => s.delete(key)); } catch { /* ignora */ }
}

/* ---------- Fila ---------- */

export async function listQueue(): Promise<QueueItem[]> {
  const all = await run<QueueItem[]>(STORE, 'readonly', (s) => s.getAll() as IDBRequest<QueueItem[]>);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function countQueue(): Promise<number> {
  const all = await listQueue();
  return all.filter((i) => i.status === 'pending').length;
}

async function put(item: QueueItem): Promise<void> {
  await run(STORE, 'readwrite', (s) => s.put(item));
}

async function remove(id: string): Promise<void> {
  await run(STORE, 'readwrite', (s) => s.delete(id));
}

/* ---------- Regra dos 3 dias ---------- */

export function markOnline(): void {
  try { localStorage.setItem(LAST_ONLINE_KEY, String(Date.now())); } catch { /* ignora */ }
}

export function offlineBlocked(): boolean {
  if (navigator.onLine) return false;
  try {
    const last = Number(localStorage.getItem(LAST_ONLINE_KEY) || 0);
    return !last || Date.now() - last > MAX_OFFLINE_MS;
  } catch { return false; }
}

/* ---------- Enfileirar ---------- */

export function provisionalNumber(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'OFF-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '-' + rnd;
}

async function enqueue(
  kind: QueueKind,
  build: (id: string) => Record<string, unknown>,
  extra: Partial<QueueItem> = {},
  fixedId?: string | null,
): Promise<QueueItem> {
  const id = fixedId || crypto.randomUUID();
  const item: QueueItem = { id, kind, params: build(id), status: 'pending', createdAt: Date.now(), ...extra };
  await put(item);
  notify();
  return item;
}

export function queueSale(i: OfflineSaleInput): Promise<QueueItem> {
  const provisional = provisionalNumber();
  const soldAt = new Date().toISOString();
  return enqueue('sale', (id) => ({
    p_store: i.storeId,
    p_customer: i.customerId ?? null,
    p_items: i.items,
    p_discount: i.discount ?? 0,
    p_shipping: i.shipping ?? 0,
    p_payments: i.payments,
    p_send_to_expedition: !!i.sendToExpedition,
    p_seller: i.sellerId ?? null,
    p_warehouse: i.warehouseId ?? null,
    p_note: i.note ?? null,
    p_idem: id,
    p_channel: i.channel || 'pdv',
    p_sold_at: soldAt,
    p_offline_ref: provisional,
  }), { origin: i.origin ?? null, provisional }, i.idem);
}

export function queueCashMove(sessionId: string, kind: string, amount: number, reason?: string | null): Promise<QueueItem> {
  const at = new Date().toISOString();
  return enqueue('cash_move', (id) => ({
    p_session: sessionId, p_kind: kind, p_amount: amount, p_reason: reason ?? null, p_at: at, p_idem: id,
  }));
}

export function queueCashClose(sessionId: string, counted: number, note?: string | null): Promise<QueueItem> {
  const at = new Date().toISOString();
  return enqueue('cash_close', (id) => ({
    p_session: sessionId, p_counted: counted, p_closed_at: at, p_note: note ?? null, p_idem: id,
  }));
}

/* ---------- Sincronizar ---------- */

const RPC_BY_KIND: Record<QueueKind, string> = {
  sale: 'gestor_pdv_sale_sync',
  cash_move: 'gestor_cash_move',
  cash_close: 'gestor_cash_close',
};

function isNetworkError(e: unknown): boolean {
  const msg = String((e as any)?.message ?? e ?? '');
  return !navigator.onLine || /failed to fetch|networkerror|network request failed|load failed/i.test(msg);
}

let syncing = false;

export async function syncQueue(): Promise<SyncSummary> {
  const summary: SyncSummary = { done: 0, failed: 0, pending: 0, offline: false, sales: [] };
  if (syncing) return summary;
  if (!navigator.onLine) { summary.offline = true; summary.pending = await countQueue(); return summary; }
  syncing = true;
  try {
    const all = await listQueue();
    const items = all.filter((i) => i.status === 'pending');
    // Fechamento so vai depois que nenhuma venda estiver com erro (senao o caixa fecha sem ela)
    let blockClose = all.some((i) => i.status === 'error' && i.kind === 'sale');
    for (const it of items) {
      if (it.kind === 'cash_close' && blockClose) continue;
      try {
        const { data, error } = await sb.rpc(RPC_BY_KIND[it.kind], it.params);
        if (error) throw error;
        markOnline();
        if (it.kind === 'sale') {
          const orderId = (data as any)?.order_id as string | undefined;
          if (it.origin && orderId) {
            try { await setOrderOrigin(orderId, it.origin); }
            catch (e) { console.warn('[PDV] origem não gravada:', e); }
          }
          summary.sales.push({ provisional: it.provisional ?? null, result: data });
        }
        await remove(it.id);
        summary.done += 1;
      } catch (e) {
        if (isNetworkError(e)) { summary.offline = true; break; }
        await put({ ...it, status: 'error', error: String((e as any)?.message ?? e) });
        summary.failed += 1;
        if (it.kind === 'sale') blockClose = true;
      }
    }
  } finally {
    syncing = false;
    notify();
  }
  summary.pending = await countQueue();
  return summary;
}

export async function retryFailed(): Promise<void> {
  const all = await listQueue();
  for (const it of all) if (it.status === 'error') await put({ ...it, status: 'pending', error: null });
  notify();
}

/* ---------- PWA ---------- */

export function registerPdvSw(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('[PDV] service worker:', e));
}