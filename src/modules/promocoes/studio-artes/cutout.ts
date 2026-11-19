import { removeBackground } from '@imgly/background-removal';

const cache = new Map<string, Promise<HTMLImageElement>>();

async function fetchBlob(src: string): Promise<Blob> {
  const tryFetch = async (u: string) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.blob();
  };
  try {
    return await tryFetch(src);
  } catch {
    return await tryFetch(`https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ''))}&output=png`);
  }
}

function loadUrl(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Falha ao carregar recorte'));
    i.src = url;
  });
}

/** Remove as margens transparentes: o objeto passa a ocupar 100% da imagem. */
function trim(img: HTMLImageElement): Promise<HTMLImageElement> {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return Promise.resolve(img);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const o = document.createElement('canvas');
  o.width = w;
  o.height = h;
  o.getContext('2d')!.drawImage(c, minX, minY, w, h, 0, 0, w, h);
  return new Promise((res, rej) =>
    o.toBlob((b) => (b ? loadUrl(URL.createObjectURL(b)).then(res, rej) : rej(new Error('trim falhou'))), 'image/png'),
  );
}

export function getCutout(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit) return hit;
  const p = (async () => {
    const blob = await fetchBlob(src);
    const out = await removeBackground(blob, { output: { format: 'image/png' } });
    return trim(await loadUrl(URL.createObjectURL(out)));
  })();
  p.catch(() => cache.delete(src));
  cache.set(src, p);
  return p;
}