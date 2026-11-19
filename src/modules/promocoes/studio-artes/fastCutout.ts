type Cfg = Record<string, unknown>;

const MAX_SIDE = 1280;
let chain: Promise<void> = Promise.resolve();
let pending = 0;
const listeners = new Set<(n: number) => void>();
const emit = () => listeners.forEach((f) => f(pending));

export function onCutoutQueue(fn: (pending: number) => void) {
  listeners.add(fn);
  fn(pending);
  return () => { listeners.delete(fn); };
}

async function downscale(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (k >= 1) { bmp.close(); return blob; }
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  let out: Blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    out = await c.convertToBlob({ type: 'image/png' });
  } else {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    out = await new Promise<Blob>((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falhou'))), 'image/png'),
    );
  }
  bmp.close();
  return out;
}

export function removeBackgroundFast(input: Blob, config?: Cfg): Promise<Blob> {
  pending++;
  emit();
  const run = async (): Promise<Blob> => {
    await new Promise((r) => setTimeout(r, 0));
    const lib: any = await import('@imgly/background-removal');
    let src: Blob = input;
    try { src = await downscale(input); } catch { src = input; }
    const out = (await lib.removeBackground(src, { proxyToWorker: true, ...(config ?? {}) })) as Blob;
    await new Promise((r) => setTimeout(r, 0));
    return out;
  };
  const job = chain.then(run);
  chain = job.then(() => undefined, () => undefined);
  return job.finally(() => { pending--; emit(); });
}