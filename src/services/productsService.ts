import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface CatalogProduct {
  id: string;
  store_id: string;
  name: string;
  price: number | null;
  sku: string | null;
  category: string | null;
  image_url: string | null;
  product_url: string | null;
  active: boolean | null;
  origin: string | null;
  created_at: string | null;
}

export interface CatalogCategory { id: string; name: string }

export interface ProductInput {
  name: string;
  category: string;
  price: number;
  product_url: string;
  image_url: string;
  active: boolean;
}

export interface ImportItem {
  name: string;
  price: number;
  product_url: string;
  image_url: string;
  category: string;
  sku: string;
  externalId: string;
  description: string;
}

export interface ImportSummary {
  imported: number;
  discarded: { name: string; sku: string; reason: string }[];
}

const COLS = 'id,store_id,name,price,sku,category,image_url,product_url,active,origin,created_at';
const INVALID_SKU = ['-', '—', 'N/A', 'NA', 'NULL', 'UNDEFINED'];

export const normalizeSku = (value: string): string => {
  const v = (value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return !v || INVALID_SKU.includes(v) ? '' : v;
};

export const parsePrice = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? '').replace(/<[^>]*>/g, '').replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const listProducts = (storeId: string) =>
  fetchAll<CatalogProduct>((a, b) =>
    sb.from('products').select(COLS).eq('store_id', storeId).order('created_at', { ascending: false }).range(a, b));

export async function saveProduct(storeId: string, input: ProductInput, id?: string): Promise<CatalogProduct> {
  const payload = {
    name: input.name.trim(),
    category: input.category || null,
    price: input.price,
    product_url: input.product_url.trim(),
    image_url: input.image_url,
    active: input.active,
    is_active: input.active,
    updated_at: new Date().toISOString(),
  };
  const q = id
    ? sb.from('products').update(payload).eq('id', id).eq('store_id', storeId)
    : sb.from('products').insert({ ...payload, store_id: storeId, origin: 'manual' });
  const { data, error } = await q.select(COLS).single();
  if (error) throw error;
  return data as CatalogProduct;
}

export async function setProductActive(storeId: string, id: string, active: boolean): Promise<void> {
  const { error } = await sb.from('products')
    .update({ active, is_active: active, updated_at: new Date().toISOString() })
    .eq('id', id).eq('store_id', storeId);
  if (error) throw error;
}

export async function deleteProducts(storeId: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await sb.from('products').delete().eq('store_id', storeId).in('id', ids.slice(i, i + 100));
    if (error) throw error;
  }
}

export async function listCategories(storeId: string): Promise<CatalogCategory[]> {
  const { data, error } = await sb.from('product_categories').select('id,name').eq('store_id', storeId).order('name');
  if (error) throw error;
  return data || [];
}

export async function addCategory(storeId: string, name: string): Promise<CatalogCategory> {
  const { data, error } = await sb.from('product_categories')
    .insert({ store_id: storeId, name: name.trim() }).select('id,name').single();
  if (error) throw new Error(error.code === '23505' ? 'Essa categoria já existe.' : error.message);
  return data;
}

export async function renameCategory(storeId: string, id: string, oldName: string, newName: string): Promise<void> {
  const name = newName.trim();
  const { error } = await sb.from('product_categories').update({ name }).eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(error.code === '23505' ? 'Essa categoria já existe.' : error.message);
  const { error: e2 } = await sb.from('products').update({ category: name }).eq('store_id', storeId).eq('category', oldName);
  if (e2) throw e2;
}

export async function deleteCategory(storeId: string, id: string): Promise<void> {
  const { error } = await sb.from('product_categories').delete().eq('id', id).eq('store_id', storeId);
  if (error) throw error;
}

export async function ensureCategories(storeId: string, names: string[]): Promise<void> {
  const unique = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
  if (!unique.length) return;
  await sb.from('product_categories')
    .upsert(unique.map(name => ({ store_id: storeId, name })), { onConflict: 'store_id,name', ignoreDuplicates: true });
}

export async function importProducts(
  storeId: string,
  items: ImportItem[],
  origin: 'xml' | 'planilha',
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const existingRows = await fetchAll<{ sku: string | null }>((a, b) =>
    sb.from('products').select('sku').eq('store_id', storeId).not('sku', 'is', null).range(a, b));
  const existing = new Set(existingRows.map(r => (r.sku || '').trim().toLowerCase()).filter(Boolean));

  const now = new Date().toISOString();
  const seen = new Set<string>();
  const rows: any[] = [];
  const discarded: ImportSummary['discarded'] = [];

  for (const it of items) {
    const sku = normalizeSku(it.sku);
    const key = sku.toLowerCase();
    if (!sku) { discarded.push({ name: it.name, sku: '', reason: 'Sem SKU' }); continue; }
    if (seen.has(key)) { discarded.push({ name: it.name, sku, reason: 'SKU repetido no arquivo' }); continue; }
    seen.add(key);
    if (existing.has(key)) { discarded.push({ name: it.name, sku, reason: 'Já existe no catálogo' }); continue; }
    rows.push({
      store_id: storeId,
      name: it.name.trim(),
      price: it.price,
      product_url: it.product_url,
      image_url: it.image_url || '',
      images: it.image_url ? [it.image_url] : [],
      category: it.category || null,
      sku,
      external_id: it.externalId || null,
      xml_id: it.externalId || null,
      short_description: it.description || null,
      active: true,
      is_active: true,
      origin,
      import_source: origin,
      last_imported_at: now,
    });
  }

  let imported = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await sb.from('products').insert(batch);
    if (!error) {
      imported += batch.length;
    } else {
      for (const r of batch) {
        const { error: e } = await sb.from('products').insert(r);
        if (e) discarded.push({ name: r.name, sku: r.sku, reason: e.message });
        else imported++;
      }
    }
    onProgress?.(Math.min(i + 100, rows.length), rows.length);
  }

  await ensureCategories(storeId, rows.map(r => r.category || ''));
  return { imported, discarded };
}