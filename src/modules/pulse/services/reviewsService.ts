import type { SupabaseClient } from '@supabase/supabase-js';
import type { Review, ReviewInput, ReviewMedia, ReviewWidget, ReviewWidgetInput } from '../types/reviews';

const MAX_IMG = 1600;
const MAX_VIDEO_MB = 50;
const MAX_VIDEO_S = 30;

async function call<T>(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

function canvasToWebp(c: HTMLCanvasElement, q = 0.82): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob(
    (b) => (b && b.type === 'image/webp' ? res(b) : rej(new Error('Seu navegador não gera WebP. Use Chrome, Edge ou Firefox.'))),
    'image/webp', q));
}

async function imageToWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_IMG / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível.');
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return canvasToWebp(c);
}

function videoPoster(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    const end = (fn: () => void) => { window.clearTimeout(timer); URL.revokeObjectURL(url); fn(); };
    const timer = window.setTimeout(() => end(() => reject(new Error('Não foi possível ler o vídeo.'))), 15000);
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
    v.onerror = () => end(() => reject(new Error('Vídeo inválido ou formato não suportado.')));
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      if (d > MAX_VIDEO_S + 0.5) { end(() => reject(new Error(`O vídeo deve ter até ${MAX_VIDEO_S}s.`))); return; }
      v.currentTime = Math.max(0.1, Math.min(0.5, d / 2));
    };
    v.onseeked = () => {
      const k = Math.min(1, 720 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(v.videoWidth * k));
      c.height = Math.max(1, Math.round(v.videoHeight * k));
      const ctx = c.getContext('2d');
      if (!ctx) { end(() => reject(new Error('Canvas indisponível.'))); return; }
      ctx.drawImage(v, 0, 0, c.width, c.height);
      canvasToWebp(c, 0.8).then((b) => end(() => resolve(b)), (e: Error) => end(() => reject(e)));
    };
  });
}

async function put(sb: SupabaseClient, storeId: string, blob: Blob, ext: string, type: string): Promise<string> {
  const path = `${storeId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('reviews').upload(path, blob, { contentType: type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return sb.storage.from('reviews').getPublicUrl(path).data.publicUrl;
}

export const reviewsService = (sb: SupabaseClient) => ({
  list: (storeId: string) => call<Review[]>(sb, 'reviews_list', { p_store_id: storeId }),
  save: (storeId: string, r: ReviewInput) =>
    call<{ id: string }>(sb, 'review_save', {
      p_store_id: storeId, p_id: r.id ?? null,
      p_data: {
        source: r.source, product_ref: r.product_ref, product_name: r.product_name, author_name: r.author_name,
        rating: r.rating, title: r.title, body: r.body, review_date: r.review_date, verified: r.verified,
        status: r.status, media: r.media.map((m) => ({ kind: m.kind, url: m.url, poster_url: m.poster_url ?? null })),
      },
    }),
  setStatus: (storeId: string, id: string, status: string) =>
    call<void>(sb, 'review_set_status', { p_store_id: storeId, p_id: id, p_status: status }),
  remove: (storeId: string, id: string) => call<void>(sb, 'review_delete', { p_store_id: storeId, p_id: id }),

  widgetsList: (storeId: string) => call<ReviewWidget[]>(sb, 'review_widgets_list', { p_store_id: storeId }),
  widgetSave: (storeId: string, w: ReviewWidgetInput) =>
    call<ReviewWidget>(sb, 'review_widget_save', {
      p_store_id: storeId, p_id: w.id ?? null,
      p_data: { name: w.name, active: w.active, scope: w.scope, template: w.template, min_rating: w.min_rating,
        sources: w.sources, max_items: w.max_items, placement: w.placement, design: w.design },
    }),
  widgetSetActive: (storeId: string, id: string, active: boolean) =>
    call<void>(sb, 'review_widget_set_active', { p_store_id: storeId, p_id: id, p_active: active }),
  widgetDelete: (storeId: string, id: string) => call<void>(sb, 'review_widget_delete', { p_store_id: storeId, p_id: id }),

  async uploadMedia(storeId: string, file: File): Promise<ReviewMedia> {
    if (file.type.startsWith('image/')) {
      const url = await put(sb, storeId, await imageToWebp(file), 'webp', 'image/webp');
      return { kind: 'image', url };
    }
    if (file.type === 'video/mp4' || file.type === 'video/webm') {
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`O vídeo deve ter até ${MAX_VIDEO_MB} MB.`);
      const poster = await videoPoster(file);
      const ext = file.type === 'video/mp4' ? 'mp4' : 'webm';
      const [url, poster_url] = await Promise.all([
        put(sb, storeId, file, ext, file.type),
        put(sb, storeId, poster, 'webp', 'image/webp'),
      ]);
      return { kind: 'video', url, poster_url };
    }
    throw new Error('Formato não suportado. Use imagem, mp4 ou webm.');
  },
});
