import { supabase } from '@/lib/supabase';
import { getCurrentStoreId } from './pages';

export interface StoreProduct {
  description?: string;
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  salePrice: number | null;
  image: string;
  url: string;
}

function firstImage(row: { image_url?: string | null; images?: unknown }): string {
  if (row.image_url) return row.image_url;
  const imgs = row.images;
  if (Array.isArray(imgs) && imgs.length) {
    const f = imgs[0] as unknown;
    if (typeof f === 'string') return f;
    if (f && typeof f === 'object') {
      const o = f as Record<string, unknown>;
      return String(o.url ?? o.src ?? '');
    }
  }
  return '';
}

export async function searchProducts(term: string, limit = 30): Promise<StoreProduct[]> {
  const storeId = await getCurrentStoreId();
  let q = supabase
    .from('products')
    .select('id,name,sku,price,sale_price,image_url,images,product_url,short_description')
    .eq('store_id', storeId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  const t = term.trim().replace(/[,()%]/g, ' ');
  if (t) q = q.or(`name.ilike.%${t}%,sku.ilike.%${t}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    sku: r.sku ?? null,
    price: r.price != null ? Number(r.price) : null,
    salePrice: r.sale_price != null ? Number(r.sale_price) : null,
    image: firstImage(r),
    url: r.product_url ?? '',
    description: (r as { short_description?: string | null }).short_description ?? '',
  }));
}

export const brl = (v: number | null) =>
  v == null ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
