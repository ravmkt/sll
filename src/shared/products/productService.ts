import { supabase } from '@/lib/supabase';
import type {
  CustomFieldDef, KitItem, PriceList, ProductDraft, ProductPrice, ProductRow, ProductSupplier,
} from './types';

export function isValidGtin(gtin?: string | null): boolean {
  const g = (gtin ?? '').trim();
  if (!g) return true;
  if (!/^\d+$/.test(g) || ![8, 12, 13, 14].includes(g.length)) return false;
  const digits = g.split('').map(Number);
  const check = digits.pop() as number;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function emptyProduct(): ProductRow {
  return {
    name: '', sku: null, format: 'simple', unit: 'UN', gtin: null, validity_date: null,
    tags: [], min_stock: null, max_stock: null, stock_location: null, cost_price: null,
    video_url: null, notes: null, net_weight_kg: null, gross_weight_kg: null,
    width_cm: null, height_cm: null, depth_cm: null, tax: {}, extra_fields: {},
  } as unknown as ProductRow;
}

export function validateDraft(draft: ProductDraft): string[] {
  const p = draft.product;
  const errors: string[] = [];
  if (!p.name?.trim()) errors.push('Informe o nome do produto.');
  if (!p.unit?.trim()) errors.push('Informe a unidade.');
  if (!isValidGtin(p.gtin)) errors.push('GTIN/EAN inválido (dígito verificador não confere).');
  if (p.min_stock != null && p.max_stock != null && p.min_stock > p.max_stock)
    errors.push('O estoque mínimo não pode ser maior que o máximo.');
  if (p.net_weight_kg != null && p.gross_weight_kg != null && p.net_weight_kg > p.gross_weight_kg)
    errors.push('O peso líquido não pode ser maior que o bruto.');
  if (p.format === 'kit' && draft.kitItems.length === 0)
    errors.push('Adicione ao menos um componente ao kit.');
  if (draft.prices.some((x) => x.price < 0)) errors.push('Preços não podem ser negativos.');
  return errors;
}

export async function getProductFull(storeId: string, productId: string): Promise<ProductDraft> {
  const { data: prod, error } = await supabase
    .from('products').select('*').eq('id', productId).eq('store_id', storeId).single();
  if (error) throw new Error(error.message);

  const [prices, suppliers, kit] = await Promise.all([
    supabase.from('product_prices').select('price_list_id, variant_id, price')
      .eq('store_id', storeId).eq('product_id', productId).is('variant_id', null),
    supabase.from('product_suppliers')
      .select('supplier_id, supplier_name, supplier_code, purchase_cost, is_default')
      .eq('store_id', storeId).eq('product_id', productId).order('created_at'),
    supabase.from('product_kit_items')
      .select('component_product_id, component_variant_id, qty')
      .eq('store_id', storeId).eq('kit_product_id', productId),
  ]);
  for (const r of [prices, suppliers, kit]) if (r.error) throw new Error(r.error.message);

  const row = prod as Record<string, unknown>;
  const product = {
    ...emptyProduct(), ...row,
    tags: (row.tags as string[] | null) ?? [],
    tax: (row.tax as object | null) ?? {},
    extra_fields: (row.extra_fields as object | null) ?? {},
  } as unknown as ProductRow;

  return {
    product,
    prices: (prices.data ?? []).map((p) => ({
      price_list_id: p.price_list_id as string, variant_id: null, price: Number(p.price),
    })) as ProductPrice[],
    suppliers: (suppliers.data ?? []) as ProductSupplier[],
    kitItems: (kit.data ?? []).map((k) => ({
      component_product_id: k.component_product_id as string,
      component_variant_id: (k.component_variant_id as string | null) ?? null,
      qty: Number(k.qty),
    })) as unknown as KitItem[],
  };
}

const SKIP = new Set(['id', 'store_id', 'created_at', 'updated_at']);

export async function saveProduct(storeId: string, draft: ProductDraft): Promise<string> {
  const raw = draft.product as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (SKIP.has(k) || v === undefined) continue;
    payload[k] = typeof v === 'string' && v.trim() === '' ? null : v;
  }
  payload.name = String(raw.name ?? '').trim();
  payload.tags = (raw.tags as string[] | undefined) ?? [];

  let id = raw.id as string | undefined;
  if (id) {
    const { error } = await supabase.from('products').update(payload).eq('id', id).eq('store_id', storeId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from('products').insert({ ...payload, store_id: storeId }).select('id').single();
    if (error) throw new Error(error.message);
    id = data.id as string;
  }

  // Precos do produto (padrao, sem variacao)
  const delPrices = await supabase.from('product_prices').delete()
    .eq('store_id', storeId).eq('product_id', id).is('variant_id', null);
  if (delPrices.error) throw new Error(delPrices.error.message);
  if (draft.prices.length) {
    const { error } = await supabase.from('product_prices').insert(
      draft.prices.map((p) => ({
        store_id: storeId, product_id: id, price_list_id: p.price_list_id, variant_id: null, price: p.price,
      })),
    );
    if (error) throw new Error(error.message);
  }

  // Fornecedores
  const delSup = await supabase.from('product_suppliers').delete().eq('store_id', storeId).eq('product_id', id);
  if (delSup.error) throw new Error(delSup.error.message);
  const sups = draft.suppliers.filter((s) => s.supplier_id || s.supplier_name?.trim());
  if (sups.length) {
    const { error } = await supabase.from('product_suppliers').insert(
      sups.map((s) => ({
        store_id: storeId, product_id: id, supplier_id: s.supplier_id || null,
        supplier_name: s.supplier_name?.trim() || null, supplier_code: s.supplier_code?.trim() || null,
        purchase_cost: s.purchase_cost ?? null, is_default: !!s.is_default,
      })),
    );
    if (error) throw new Error(error.message);
  }

  // Composicao do kit
  const delKit = await supabase.from('product_kit_items').delete().eq('store_id', storeId).eq('kit_product_id', id);
  if (delKit.error) throw new Error(delKit.error.message);
  if (raw.format === 'kit' && draft.kitItems.length) {
    const { error } = await supabase.from('product_kit_items').insert(
      draft.kitItems.map((k) => ({
        store_id: storeId, kit_product_id: id, component_product_id: k.component_product_id,
        component_variant_id: (k as { component_variant_id?: string | null }).component_variant_id ?? null,
        qty: k.qty,
      })),
    );
    if (error) throw new Error(error.message);
  }

  return id as string;
}

export async function listPriceLists(storeId: string): Promise<PriceList[]> {
  const { data, error } = await supabase.from('price_lists').select('*').eq('store_id', storeId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as PriceList[];
}

export async function createPriceList(storeId: string, name: string): Promise<void> {
  const { error } = await supabase.from('price_lists').insert({ store_id: storeId, name: name.trim(), active: true });
  if (error) throw new Error(error.message);
}

export async function searchProductsForKit(
  storeId: string, term: string,
): Promise<{ id: string; name: string; sku: string | null }[]> {
  const t = term.trim().replace(/[%,()]/g, ' ');
  const { data, error } = await supabase.from('products').select('id, name, sku')
    .eq('store_id', storeId).or(`name.ilike.%${t}%,sku.ilike.%${t}%`).order('name').limit(15);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; sku: string | null }[];
}

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export async function listCustomFieldDefs(storeId: string): Promise<CustomFieldDef[]> {
  const { data, error } = await supabase.from('custom_field_defs').select('*')
    .eq('store_id', storeId).eq('entity', 'product').order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map((d: Record<string, unknown>) => ({
    ...d, options: Array.isArray(d.options) ? d.options : [],
  })) as unknown as CustomFieldDef[];
}

export async function saveCustomFieldDef(storeId: string, def: CustomFieldDef): Promise<void> {
  const key = slug(def.key || def.label);
  if (!key) throw new Error('Nome de campo inválido.');
  const row = {
    store_id: storeId, entity: def.entity ?? 'product', key, label: def.label,
    field_type: def.field_type, options: def.options ?? [], sort_order: def.sort_order ?? 0,
  };
  const q = def.id
    ? supabase.from('custom_field_defs').update(row).eq('id', def.id).eq('store_id', storeId)
    : supabase.from('custom_field_defs').insert(row);
  const { error } = await q;
  if (error) throw new Error(error.code === '23505' ? 'Já existe um campo com esse nome.' : error.message);
}

export async function deleteCustomFieldDef(storeId: string, id: string): Promise<void> {
  const { error } = await supabase.from('custom_field_defs').delete().eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(error.message);
}
