export type QueueKind = 'sale' | 'cash_move' | 'cash_close';

export interface QueueItem {
  id: string; // use como chave de idempotencia no servidor
  kind: QueueKind;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export const OFFLINE_MAX_MS = 3 * 24 * 60 * 60 * 1000;
const DB_NAME = 'sll-pdv';
const LAST_ONLINE_KEY = 'sll-pdv-last-online';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('catalog')) db.createObjectStore('catalog', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}

export async function enqueue(kind: QueueKind, payload: unknown): Promise<QueueItem> {
  const item: QueueItem = { id: crypto.randomUUID(), kind, payload, createdAt: Date.now(), attempts: 0 };
  await tx('queue', 'readwrite', (s) => s.add(item));
  return item;
}

export async function listQueue(): Promise<QueueItem[]> {
  const all = await tx<QueueItem[]>('queue', 'readonly', (s) => s.getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeItem(id: string): Promise<void> {
  await tx('queue', 'readwrite', (s) => s.delete(id));
}

export async function markFailed(id: string, message: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction('queue', 'readwrite');
    const s = t.objectStore('queue');
    const g = s.get(id);
    g.onsuccess = () => {
      const it = g.result as QueueItem | undefined;
      if (it) s.put({ ...it, attempts: it.attempts + 1, lastError: message });
    };
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => reject(t.error);
  });
}

export async function saveCatalog<T>(key: string, data: T): Promise<void> {
  await tx('catalog', 'readwrite', (s) => s.put({ key, data, savedAt: Date.now() }));
}

export async function loadCatalog<T>(key: string): Promise<T | null> {
  const row = await tx<{ data: T } | undefined>('catalog', 'readonly', (s) => s.get(key));
  return row ? row.data : null;
}

export function touchOnline(): void {
  try { localStorage.setItem(LAST_ONLINE_KEY, String(Date.now())); } catch { /* ignora */ }
}

export function isOfflineExpired(): boolean {
  try {
    const v = Number(localStorage.getItem(LAST_ONLINE_KEY) || 0);
    return v > 0 && Date.now() - v > OFFLINE_MAX_MS;
  } catch {
    return false;
  }
}