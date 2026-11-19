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

export function getCutout(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit) return hit;
  const p = (async () => {
    const blob = await fetchBlob(src);
    const out = await removeBackground(blob, { output: { format: 'image/png' } });
    return loadUrl(URL.createObjectURL(out));
  })();
  p.catch(() => cache.delete(src));
  cache.set(src, p);
  return p;
}