type Cfg = Record<string, unknown>;

const MAX_SIDE = 1024;
const JOB_TIMEOUT = 150000;

let chain: Promise<void> = Promise.resolve();
let pending = 0;
const listeners = new Set<(n: number) => void>();
const emit = () => listeners.forEach((f) => f(pending));

export function onCutoutQueue(fn: (pending: number) => void) {
  listeners.add(fn);
  fn(pending);
  return () => { listeners.delete(fn); };
}

/* ---------- Worker proprio ---------- */
let worker: Worker | null = null;
let workerBroken = false;
let failCount = 0;
let seq = 0;
const waiting = new Map<number, { res: (b: Blob) => void; rej: (e: Error) => void }>();

function failAll(msg: string) {
  waiting.forEach((w) => w.rej(new Error(msg)));
  waiting.clear();
}

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL('./cutout.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const job = waiting.get(e.data.id);
      if (!job) return;
      waiting.delete(e.data.id);
      if (e.data.blob) job.res(e.data.blob);
      else job.rej(new Error(e.data.error || 'worker falhou'));
    };
    w.onerror = (ev) => {
      workerBroken = true;
      worker = null;
      w.terminate();
      failAll(ev.message || 'erro no worker');
    };
    worker = w;
    return w;
  } catch {
    workerBroken = true;
    return null;
  }
}

function viaWorker(blob: Blob): Promise<Blob> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error('sem worker'));
  const id = ++seq;
  return new Promise<Blob>((res, rej) => {
    const timer = setTimeout(() => {
      waiting.delete(id);
      rej(new Error('timeout no worker'));
    }, JOB_TIMEOUT);
    waiting.set(id, {
      res: (b) => { clearTimeout(timer); res(b); },
      rej: (e) => { clearTimeout(timer); rej(e); },
    });
    w.postMessage({ id, blob });
  });
}

/* ---------- Fallback na thread principal ---------- */
async function downscale(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (k >= 1) { bmp.close(); return blob; }
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falhou'))), 'image/png'),
  );
}

async function viaMain(input: Blob, config?: Cfg): Promise<Blob> {
  await new Promise((r) => setTimeout(r, 0));
  const lib: any = await import('@imgly/background-removal');
  let src: Blob = input;
  try { src = await downscale(input); } catch { src = input; }
  return (await lib.removeBackground(src, { proxyToWorker: true, ...(config ?? {}) })) as Blob;
}

/* ---------- API ---------- */
export function removeBackgroundFast(input: Blob, config?: Cfg): Promise<Blob> {
  pending++;
  emit();
  const run = async (): Promise<Blob> => {
    try {
      return await viaWorker(input);
    } catch {
      failCount++;
      if (failCount >= 2) workerBroken = true;
      return viaMain(input, config);
    }
  };
  const job = chain.then(run);
  chain = job.then(() => undefined, () => undefined);
  return job.finally(() => { pending--; emit(); });
}