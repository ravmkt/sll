import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface GProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  image_url: string | null;
  active: boolean | null;
  description: string | null;
}

export interface GVariant {
  id: string;
  product_id: string;
  sku: string;
  title: string | null;
  option_name: string | null;
  option_value: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  position: number | null;
}

export interface Movement {
  id: string;
  type: string;
  qty: number;
  balance_after: number | null;
  channel: string;
  note: string | null;
  created_at: string;
}

export type MoveType = 'purchase' | 'return' | 'sale' | 'loss' | 'adjustment';

export async function listGestorProducts(storeId: string): Promise<GProduct[]> {
  const out: GProduct[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('products')
      .select('id,name,sku,price,image_url,active,description')
      .eq('store_id', storeId)
      .order('name')
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data || []) as GProduct[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function listGestorVariants(productId: string): Promise<GVariant[]> {
  const { data, error } = await sb
    .from('product_variants')
    .select('id,product_id,sku,title,option_name,option_value,price,sale_price,stock,position')
    .eq('product_id', productId)
    .order('position');
  if (error) throw error;
  return (data || []) as GVariant[];
}

export async function updateGestorProduct(
  storeId: string,
  id: string,
  patch: { price: number; description: string },
): Promise<void> {
  const { error } = await sb
    .from('products')
    .update({ price: patch.price, description: patch.description, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('store_id', storeId);
  if (error) throw error;
}

export async function moveStock(variantId: string, type: MoveType, qty: number, note: string): Promise<number> {
  const { data, error } = await sb.rpc('gestor_stock_move', {
    p_variant: variantId,
    p_type: type,
    p_qty: qty,
    p_note: note || null,
  });
  if (error) throw error;
  return Number(data);
}

export async function stockHistory(variantId: string): Promise<Movement[]> {
  const { data, error } = await sb.rpc('gestor_stock_history', { p_variant: variantId, p_limit: 50 });
  if (error) throw error;
  return (data || []) as Movement[];
}