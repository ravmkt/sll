const CONVERTIBLE = new Set(['image/jpeg', 'image/png']);
const MAX_SIDE = 2560;
const QUALITY = 0.85;

function mimeOf(file: File): string {
  if (file.type) return file.type;
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return '';
}

// Converte JPG/PNG para WebP no navegador. GIF, AVIF e WebP passam sem alteracao.
// Se algo falhar, devolve o arquivo original.
export async function toWebp(file: File): Promise<File> {
  if (!CONVERTIBLE.has(mimeOf(file))) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', QUALITY));
    if (!blob || blob.type !== 'image/webp') return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  }
}