import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getCurrentStoreId } from './pages';

export type AssetKind = 'image' | 'video';

const BUCKET = 'builder-assets';
const MB = 1024 * 1024;

const RULES: Record<AssetKind, { max: number; label: string; types: Record<string, string> }> = {
  image: {
    max: 5 * MB,
    label: 'uma imagem JPG, PNG, WebP, GIF ou AVIF',
    types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' },
  },
  video: {
    max: 200 * MB,
    label: 'um v\u00eddeo MP4 ou WebM',
    types: { 'video/mp4': 'mp4', 'video/webm': 'webm' },
  },
};

export const ACCEPT: Record<AssetKind, string> = {
  image: Object.keys(RULES.image.types).join(','),
  video: Object.keys(RULES.video.types).join(','),
};

const mb = (n: number) => `${(n / MB).toFixed(1).replace('.', ',')} MB`;

export async function uploadBuilderAsset(file: File, kind: AssetKind): Promise<string> {
  const rule = RULES[kind];
  const ext = rule.types[file.type];
  if (!ext) throw new Error(`Formato n\u00e3o aceito. Envie ${rule.label}.`);
  if (file.size > rule.max) throw new Error(`O arquivo tem ${mb(file.size)}. O limite \u00e9 ${mb(rule.max)}.`);

  const storeId = await getCurrentStoreId();
  const sb = supabase as unknown as SupabaseClient;

  const can = await sb.rpc('store_can_upload', { p_store: storeId, p_bytes: file.size });
  if (can.error) throw new Error('N\u00e3o foi poss\u00edvel verificar o armazenamento do plano.');
  if (can.data !== true) throw new Error('Armazenamento do plano esgotado. Libere espa\u00e7o ou fa\u00e7a upgrade.');

  const path = `${storeId}/${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (up.error) throw new Error('Falha ao enviar o arquivo. Tente novamente.');

  const r = await sb.rpc('refresh_builder_storage', { p_store: storeId });
  if (r.error) console.warn('refresh_builder_storage', r.error.message);

  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
export async function deleteBuilderAsset(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  const storeId = await getCurrentStoreId();
  if (path.split('/')[0] !== storeId) return;

  const sb = supabase as unknown as SupabaseClient;
  const del = await sb.storage.from(BUCKET).remove([path]);
  if (del.error) throw new Error('Falha ao remover o arquivo.');

  const r = await sb.rpc('refresh_builder_storage', { p_store: storeId });
  if (r.error) console.warn('refresh_builder_storage', r.error.message);
}