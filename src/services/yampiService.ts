import { supabase } from '@/lib/supabase';
import { type ImportSummary, listCategories, matchCategory, normCat, normalizeSku } from '@/services/productsService';

const sb: any = supabase;

export interface YampiSku { id: string; sku: string; title: string; option: string; value: string; price: number; sale: number; stock: number }
export interface YampiProduct {
  id: string; name: string; active: boolean; url: string; image: string; images: string[];
  category: string; tier: 'tree' | 'root' | 'loose' | 'none'; loose: string[]; skus: YampiSku[];
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.functions.invoke('yampi-import', { body });
  if (error) {
    let m = error.message as string;
    try { const j = await error.context.json(); if (j?.error) m = j.error; } catch { /* sem corpo */ }
    throw new Error(m);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const getYampiStatus = (storeId: string) => call<{ connected: boolean; alias?: string }>({ action: 'status', store_id: storeId });
export const saveYampiCredentials = (storeId: string, alias: string, token: string, secret: string) =>
  call<{ ok: boolean }>({ action: 'save', store_id: storeId, alias, token, secret });
export const fetchYampi = (storeId: string) => call<{ products: YampiProduct[]; categories: number }>({ action: 'fetch', store_id: storeId });

async function pageAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// SKU do produto = prefixo comum dos SKUs das variacoes (ex.: CAL-CONF-BI-PR-MAR)
const baseSku = (skus: string[]): string => {
  if (skus.length <= 1) return skus[0] || '';
  let p = skus[0];
  for (const s of skus) while (p && !s.startsWith(p)) p = p.slice(0, -1);
  const b = p.replace(/[-_\s]+$/, '');
  return b.length >= 3 ? b : skus[0];
};

export async function importYampiProducts(
  storeId: string,
  items: YampiProduct[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const existing = await pageAll<{ sku: string | null; external_id: string | null; source_platform: string | null }>((a, b) =>
    sb.from('products').select('sku,external_id,source_platform').eq('store_id', storeId).range(a, b));
  const haveSku = new Set(existing.map((r) => (r.sku || '').trim().toLowerCase()).filter(Boolean));
  const haveExt = new Set(existing.filter((r) => r.source_platform === 'yampi').map((r) => r.external_id || ''));
  const catMap = new Map<string, string>((await listCategories(storeId)).map((c) => [normCat(c.name), c.name] as [string, string]));

  const now = new Date().toISOString();
  const discarded: ImportSummary['discarded'] = [];
  const rows: any[] = [];
  const variants = new Map<string, any[]>();
  const seen = new Set<string>();

  for (const p of items) {
    const skus = p.skus.map((s) => ({ ...s, sku: normalizeSku(s.sku) })).filter((s) => s.sku);
    if (!skus.length) { discarded.push({ name: p.name, sku: '', reason: 'Sem SKU' }); continue; }
    if (haveExt.has(p.id)) { discarded.push({ name: p.name, sku: '', reason: 'Já importado da Yampi' }); continue; }
    const base = baseSku(skus.map((s) => s.sku));
    const all = [base, ...skus.map((s) => s.sku)];
    const clash = all.find((s) => haveSku.has(s.toLowerCase()) || seen.has(s.toLowerCase()));
    if (clash) { discarded.push({ name: p.name, sku: clash, reason: 'SKU já existe no catálogo' }); continue; }
    all.forEach((s) => seen.add(s.toLowerCase()));

    const prices = skus.map((s) => s.price).filter((n) => n > 0);
    rows.push({
      store_id: storeId,
      name: p.name.trim(),
      price: prices.length ? Math.min(...prices) : 0,
      product_url: p.url,
      image_url: p.image || '',
      images: p.images,
      category: matchCategory(p.category, catMap),
      sku: base,
      external_id: p.id,
      active: p.active,
      is_active: p.active,
      origin: 'yampi',
      import_source: 'xml',
      source_platform: 'yampi',
      last_imported_at: now,
    });
    variants.set(p.id, skus.map((s, i) => ({
      store_id: storeId,
      external_id: s.id,
      sku: s.sku,
      title: s.title,
      option_name: s.option || null,
      option_value: s.value || null,
      price: s.price,
      sale_price: s.sale > 0 && s.sale < s.price ? s.sale : null,
      stock: s.stock,
      position: i,
    })));
  }

  const pending: any[] = [];
  let imported = 0;
  const keep = (saved: { id: string; external_id: string }[]) => {
    for (const s of saved) for (const v of variants.get(s.external_id) || []) pending.push({ ...v, product_id: s.id });
    imported += saved.length;
  };

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { data, error } = await sb.from('products').insert(batch).select('id,external_id');
    if (!error) keep(data || []);
    else {
      for (const r of batch) {
        const { data: one, error: e } = await sb.from('products').insert(r).select('id,external_id');
        if (e) discarded.push({ name: r.name, sku: r.sku, reason: e.message });
        else keep(one || []);
      }
    }
    onProgress?.(Math.min(i + 50, rows.length), rows.length);
  }

  for (let i = 0; i < pending.length; i += 500) {
    const { error } = await sb.from('product_variants').insert(pending.slice(i, i + 500));
    if (error) throw new Error(`Produtos importados, mas as variações falharam: ${error.message}`);
  }
  return { imported, discarded };
}