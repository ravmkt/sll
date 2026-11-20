import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface VariantRow {
  id: string;
  product_id: string;
  sku: string;
  title: string | null;
  option_name: string | null;
  option_value: string | null;
  price: number | null;
  stock: number;
}

export async function listVariantsByProduct(storeId: string): Promise<Map<string, VariantRow[]>> {
  const map = new Map<string, VariantRow[]>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('product_variants')
      .select('id,product_id,sku,title,option_name,option_value,price,stock,position')
      .eq('store_id', storeId)
      .order('position', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const v of (data ?? []) as any[]) {
      const row: VariantRow = {
        id: v.id, product_id: v.product_id, sku: v.sku, title: v.title,
        option_name: v.option_name, option_value: v.option_value,
        price: v.price != null ? Number(v.price) : null, stock: Number(v.stock || 0),
      };
      map.set(row.product_id, [...(map.get(row.product_id) ?? []), row]);
    }
    if (!data || data.length < 1000) break;
  }
  return map;
}

export const variantLabel = (v: VariantRow) => v.option_value || v.title || v.sku;

export const hasRealVariants = (vs: VariantRow[] | undefined) =>
  !!vs && (vs.length > 1 || (vs.length === 1 && !!(vs[0].option_value || vs[0].option_name)));