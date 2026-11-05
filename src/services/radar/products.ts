import type { Paged, StoreProduct } from '@/types/radar';
import { assertOk, publicDb } from './client';

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

function firstImage(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0) {
    const f: unknown = v[0];
    if (typeof f === 'string') return f;
    if (f && typeof f === 'object' && 'src' in f) return str((f as { src: unknown }).src);
  }
  return null;
}

export async function listProducts(storeId: string, search: string, page: number, pageSize: number): Promise<Paged<StoreProduct>> {
  let q = publicDb.from('products').select('*', { count: 'exact' }).eq('store_id', storeId);
  const term = search.trim().replace(/[%,]/g, ' ');
  if (term) q = q.ilike('name', `%${term}%`);
  const from = page * pageSize;
  const { data, error, count } = await q.order('name').range(from, from + pageSize - 1);
  assertOk(error);
  const items = ((data ?? []) as Record<string, unknown>[]).map<StoreProduct>((r) => ({
    id: String(r.id),
    name: str(r.name) ?? str(r.title) ?? 'Sem nome',
    sku: str(r.sku),
    image: str(r.image_url) ?? firstImage(r.images),
    price: typeof r.price === 'number' ? r.price : null,
    description: str(r.description),
  }));
  return { items, total: count ?? 0 };
}