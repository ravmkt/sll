import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface Variant {
  id: string; product_id: string; sku: string; title: string | null;
  option_name: string | null; option_value: string | null;
  price: number; sale_price: number | null; stock: number; position: number | null;
}

export async function listStock(storeId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('product_variants').select('product_id,stock').eq('store_id', storeId).order('id').range(from, from + 999);
    if (error) throw error;
    for (const r of data || []) map.set(r.product_id, (map.get(r.product_id) || 0) + Number(r.stock || 0));
    if (!data || data.length < 1000) break;
  }
  return map;
}

export async function listVariants(productId: string): Promise<Variant[]> {
  const { data, error } = await sb.from('product_variants')
    .select('id,product_id,sku,title,option_name,option_value,price,sale_price,stock,position')
    .eq('product_id', productId).order('position');
  if (error) throw error;
  return (data || []) as Variant[];
}