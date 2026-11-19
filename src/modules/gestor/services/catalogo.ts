import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface Category { id: string; name: string; parent_id: string | null; active: boolean; products: number }
export interface Brand { id: string; name: string; active: boolean; products: number }

export interface VariantDetails {
  min_stock: string; cost_price: string; ean: string; ncm: string; cest: string;
  weight_g: string; height_cm: string; width_cm: string; length_cm: string;
}

export const EMPTY_DETAILS: VariantDetails = {
  min_stock: '', cost_price: '', ean: '', ncm: '', cest: '',
  weight_g: '', height_cm: '', width_cm: '', length_cm: '',
};

function num(s: string): number | null {
  const t = (s || '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function gtinValid(code: string): boolean {
  const d = (code || '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(d.length)) return false;
  let sum = 0;
  for (let i = 1; i < d.length; i++) sum += Number(d[i - 1]) * ((d.length - i) % 2 === 1 ? 3 : 1);
  return (10 - (sum % 10)) % 10 === Number(d[d.length - 1]);
}

export function flattenTree(cats: Category[]): { cat: Category; depth: number }[] {
  const byParent = new Map<string | null, Category[]>();
  const ids = new Set(cats.map((c) => c.id));
  for (const c of cats) {
    const key = c.parent_id && ids.has(c.parent_id) ? c.parent_id : null;
    byParent.set(key, [...(byParent.get(key) || []), c]);
  }
  const out: { cat: Category; depth: number }[] = [];
  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
    for (const c of byParent.get(parent) || []) {
      if (seen.has(c.id)) continue;
      out.push({ cat: c, depth });
      walk(c.id, depth + 1, new Set([...seen, c.id]));
    }
  };
  walk(null, 0, new Set());
  return out;
}

export async function listCategories(storeId: string): Promise<Category[]> {
  const { data, error } = await sb.rpc('gestor_categories', { p_store: storeId });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({ ...r, products: Number(r.products) }));
}

export async function saveCategory(storeId: string, id: string | null, name: string, parent: string | null, active: boolean): Promise<void> {
  const { error } = await sb.rpc('gestor_category_save', { p_store: storeId, p_name: name, p_id: id, p_parent: parent, p_active: active });
  if (error) throw error;
}

export async function listBrands(storeId: string): Promise<Brand[]> {
  const { data, error } = await sb.rpc('gestor_brands', { p_store: storeId });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({ ...r, products: Number(r.products) }));
}

export async function saveBrand(storeId: string, id: string | null, name: string, active: boolean): Promise<void> {
  const { error } = await sb.rpc('gestor_brand_save', { p_store: storeId, p_name: name, p_id: id, p_active: active });
  if (error) throw error;
}

export async function getVariantDetails(variantId: string): Promise<VariantDetails> {
  const { data, error } = await sb
    .from('product_variants')
    .select('min_stock,cost_price,ean,ncm,cest,weight_g,height_cm,width_cm,length_cm')
    .eq('id', variantId)
    .single();
  if (error) throw error;
  const s = (v: unknown) => (v == null ? '' : String(v));
  return {
    min_stock: s(data.min_stock), cost_price: s(data.cost_price), ean: s(data.ean), ncm: s(data.ncm), cest: s(data.cest),
    weight_g: s(data.weight_g), height_cm: s(data.height_cm), width_cm: s(data.width_cm), length_cm: s(data.length_cm),
  };
}

export async function saveVariantDetails(variantId: string, f: VariantDetails): Promise<void> {
  const min = num(f.min_stock);
  const weight = num(f.weight_g);
  const { error } = await sb.rpc('gestor_variant_save_details', {
    p_variant: variantId,
    p_min_stock: min == null ? 0 : Math.round(min),
    p_cost: num(f.cost_price),
    p_ean: f.ean,
    p_ncm: f.ncm,
    p_cest: f.cest,
    p_weight_g: weight == null ? null : Math.round(weight),
    p_height: num(f.height_cm),
    p_width: num(f.width_cm),
    p_length: num(f.length_cm),
  });
  if (error) throw error;
}

export async function getProductCatalog(productId: string): Promise<{ category_id: string | null; brand_id: string | null }> {
  const { data, error } = await sb.from('products').select('category_id,brand_id').eq('id', productId).single();
  if (error) throw error;
  return { category_id: data.category_id ?? null, brand_id: data.brand_id ?? null };
}

export async function setProductCatalog(productId: string, categoryId: string | null, brandId: string | null): Promise<void> {
  const { error } = await sb.rpc('gestor_product_set_catalog', { p_product: productId, p_category: categoryId, p_brand: brandId });
  if (error) throw error;
}