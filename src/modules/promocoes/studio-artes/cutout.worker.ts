import { removeBackground } from '@imgly/background-removal';

const MAX_SIDE = 1024;
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (m: unknown) => void;
};

async function downscale(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (k >= 1) { bmp.close(); return blob; }
    const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return await c.convertToBlob({ type: 'image/png' });
  } catch {
    return blob;
  }
}

ctx.onmessage = async (e: MessageEvent) => {
  const { id, blob } = e.data as { id: number; blob: Blob };
  try {
    const src = await downscale(blob);
    const out = await removeBackground(src, { output: { format: 'image/png' } });
    ctx.postMessage({ id, blob: out });
  } catch (err) {
    ctx.postMessage({ id, error: String((err as Error)?.message ?? err) });
  }
};