$root = "F:\RODRIGO VICENTE\DYAD\sll-hub"
Set-Location $root
$dir = Join-Path $root "src\shared\products"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# Detecta o import do cliente Supabase já usado no projeto
$ref = Select-String -Path (Join-Path $root "src\modules\gestor\services\*.ts") -Pattern "import\s*\{\s*supabase\s*\}\s*from" |
  Select-Object -First 1
if (-not $ref) { throw "Import do supabase nao encontrado em src\modules\gestor\services" }
$supabaseImport = $ref.Line.Trim()
Write-Host "Usando: $supabaseImport" -ForegroundColor Cyan

# ---------- types.ts ----------
@'
export type ProductFormat = 'simple' | 'variation' | 'kit';

export interface ProductTax {
  origin?: string;
  ncm?: string;
  cest?: string;
  item_type?: string;
  icms_cst?: string;
  icms_rate?: number | null;
  ipi_cst?: string;
  ipi_rate?: number | null;
  pis_cst?: string;
  pis_rate?: number | null;
  cofins_cst?: string;
  cofins_rate?: number | null;
  additional_info?: string;
}

export interface ProductRow {
  id?: string;
  store_id?: string;
  name: string;
  sku?: string | null;
  format: ProductFormat;
  unit: string;
  gtin?: string | null;
  validity_date?: string | null;
  net_weight_kg?: number | null;
  gross_weight_kg?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
  video_url?: string | null;
  notes?: string | null;
  tags: string[];
  cost_price?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  stock_location?: string | null;
  tax: ProductTax;
  extra_fields: Record<string, string | number | boolean | null>;
  // demais colunas existentes (preço, descrição, marca, categoria, status...)
  [key: string]: unknown;
}

export interface PriceList {
  id: string;
  store_id: string;
  name: string;
  active: boolean;
}

export interface ProductPrice {
  id?: string;
  price_list_id: string;
  variant_id?: string | null;
  price: number;
}

export interface ProductSupplier {
  id?: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_code?: string | null;
  purchase_cost?: number | null;
  is_default: boolean;
}

export interface KitItem {
  id?: string;
  component_product_id: string;
  component_variant_id?: string | null;
  qty: number;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomFieldDef {
  id?: string;
  store_id?: string;
  entity: string;
  key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  sort_order: number;
}

export interface ProductFull {
  product: ProductRow;
  prices: ProductPrice[];
  suppliers: ProductSupplier[];
  kitItems: KitItem[];
}

export interface ProductDraft {
  product: ProductRow;
  prices: ProductPrice[];
  suppliers: ProductSupplier[];
  kitItems: KitItem[];
}
'@ | Out-File (Join-Path $dir "types.ts") -Encoding utf8

# ---------- productService.ts ----------
$service = @'
__SUPABASE_IMPORT__
import type {
  CustomFieldDef, KitItem, PriceList, ProductDraft, ProductFull,
  ProductPrice, ProductRow, ProductSupplier,
} from './types';

const EMPTY_TAX = {};

export function emptyProduct(): ProductRow {
  return {
    name: '', sku: '', format: 'simple', unit: 'UN', tags: [],
    tax: { ...EMPTY_TAX }, extra_fields: {},
  };
}

/** Valida GTIN/EAN (8, 12, 13 ou 14 digitos) com digito verificador. */
export function isValidGtin(value?: string | null): boolean {
  if (!value) return true;
  const d = value.replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(d.length)) return false;
  const nums = d.split('').map(Number);
  const check = nums.pop() as number;
  const sum = nums.reverse().reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function validateDraft(draft: ProductDraft): string[] {
  const p = draft.product;
  const errors: string[] = [];
  if (!p.name?.trim()) errors.push('Informe o nome do produto.');
  if (!p.unit?.trim()) errors.push('Informe a unidade.');
  if (!isValidGtin(p.gtin)) errors.push('GTIN/EAN invalido (digito verificador nao confere).');
  if (p.min_stock != null && p.max_stock != null && p.min_stock > p.max_stock)
    errors.push('Estoque minimo nao pode ser maior que o maximo.');
  if (p.net_weight_kg != null && p.gross_weight_kg != null && p.net_weight_kg > p.gross_weight_kg)
    errors.push('Peso liquido nao pode ser maior que o bruto.');
  if (p.format === 'kit') {
    if (draft.kitItems.length === 0) errors.push('Kit precisa de pelo menos 1 componente.');
    if (p.id && draft.kitItems.some((k) => k.component_product_id === p.id))
      errors.push('Um kit nao pode conter ele mesmo.');
  }
  if (draft.suppliers.filter((s) => s.is_default).length > 1)
    errors.push('Marque apenas 1 fornecedor como padrao.');
  return errors;
}

export async function getProductFull(storeId: string, productId: string): Promise<ProductFull> {
  const [prod, prices, suppliers, kit] = await Promise.all([
    supabase.from('products').select('*').eq('store_id', storeId).eq('id', productId).single(),
    supabase.from('product_prices').select('id, price_list_id, variant_id, price')
      .eq('store_id', storeId).eq('product_id', productId),
    supabase.from('product_suppliers')
      .select('id, supplier_id, supplier_name, supplier_code, purchase_cost, is_default')
      .eq('store_id', storeId).eq('product_id', productId),
    supabase.from('product_kit_items')
      .select('id, component_product_id, component_variant_id, qty')
      .eq('store_id', storeId).eq('kit_product_id', productId),
  ]);
  for (const r of [prod, prices, suppliers, kit]) if (r.error) throw r.error;
  return {
    product: { ...emptyProduct(), ...(prod.data as ProductRow) },
    prices: (prices.data ?? []) as ProductPrice[],
    suppliers: (suppliers.data ?? []) as ProductSupplier[],
    kitItems: (kit.data ?? []) as KitItem[],
  };
}

/** Salva produto e substitui prices/suppliers/kit. Retorna o id do produto. */
export async function saveProduct(storeId: string, draft: ProductDraft): Promise<string> {
  const errors = validateDraft(draft);
  if (errors.length) throw new Error(errors.join('\n'));

  const { id, store_id: _s, ...fields } = draft.product;
  const payload = {
    ...fields,
    store_id: storeId,
    sku: draft.product.sku?.trim() || null,
    gtin: draft.product.gtin?.replace(/\D/g, '') || null,
  };

  let productId = id as string | undefined;
  if (productId) {
    const { error } = await supabase.from('products').update(payload)
      .eq('store_id', storeId).eq('id', productId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select('id').single();
    if (error) throw error;
    productId = data.id as string;
  }

  await replaceChildren(storeId, productId, draft);
  return productId;
}

async function replaceChildren(storeId: string, productId: string, draft: ProductDraft) {
  const del = async (table: string, col: string) => {
    const { error } = await supabase.from(table).delete().eq('store_id', storeId).eq(col, productId);
    if (error) throw error;
  };
  const ins = async (table: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return;
    const { error } = await supabase.from(table).insert(rows);
    if (error) throw error;
  };

  await del('product_prices', 'product_id');
  await ins('product_prices', draft.prices
    .filter((p) => p.price != null && !Number.isNaN(p.price))
    .map((p) => ({
      store_id: storeId, product_id: productId,
      price_list_id: p.price_list_id, variant_id: p.variant_id ?? null, price: p.price,
    })));

  await del('product_suppliers', 'product_id');
  await ins('product_suppliers', draft.suppliers.map((s) => ({
    store_id: storeId, product_id: productId,
    supplier_id: s.supplier_id ?? null, supplier_name: s.supplier_name ?? null,
    supplier_code: s.supplier_code ?? null, purchase_cost: s.purchase_cost ?? null,
    is_default: s.is_default,
  })));

  await del('product_kit_items', 'kit_product_id');
  if (draft.product.format === 'kit') {
    await ins('product_kit_items', draft.kitItems.map((k) => ({
      store_id: storeId, kit_product_id: productId,
      component_product_id: k.component_product_id,
      component_variant_id: k.component_variant_id ?? null, qty: k.qty,
    })));
  }
}

// ---------- Listas de preco ----------
export async function listPriceLists(storeId: string): Promise<PriceList[]> {
  const { data, error } = await supabase.from('price_lists').select('*')
    .eq('store_id', storeId).order('name');
  if (error) throw error;
  return (data ?? []) as PriceList[];
}

export async function createPriceList(storeId: string, name: string): Promise<PriceList> {
  const { data, error } = await supabase.from('price_lists')
    .insert({ store_id: storeId, name: name.trim() }).select('*').single();
  if (error) throw error;
  return data as PriceList;
}

export async function setPriceListActive(storeId: string, id: string, active: boolean) {
  const { error } = await supabase.from('price_lists').update({ active })
    .eq('store_id', storeId).eq('id', id);
  if (error) throw error;
}

// ---------- Campos extras ----------
export async function listCustomFieldDefs(storeId: string): Promise<CustomFieldDef[]> {
  const { data, error } = await supabase.from('custom_field_defs').select('*')
    .eq('store_id', storeId).eq('entity', 'product').order('sort_order');
  if (error) throw error;
  return (data ?? []) as CustomFieldDef[];
}

export async function saveCustomFieldDef(storeId: string, def: CustomFieldDef) {
  const key = def.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const row = { ...def, key, store_id: storeId, entity: 'product' };
  const { error } = await supabase.from('custom_field_defs')
    .upsert(row, { onConflict: 'store_id,entity,key' });
  if (error) throw error;
}

export async function deleteCustomFieldDef(storeId: string, id: string) {
  const { error } = await supabase.from('custom_field_defs').delete()
    .eq('store_id', storeId).eq('id', id);
  if (error) throw error;
}

// ---------- Busca de componentes para kit ----------
export async function searchProductsForKit(storeId: string, term: string, limit = 15) {
  const t = term.trim();
  let q = supabase.from('products').select('id, name, sku')
    .eq('store_id', storeId).neq('format', 'kit').limit(limit);
  if (t) q = q.or(`name.ilike.%${t}%,sku.ilike.%${t}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; sku: string | null }[];
}
'@
$service = $service.Replace('__SUPABASE_IMPORT__', $supabaseImport)
$service | Out-File (Join-Path $dir "productService.ts") -Encoding utf8

Write-Host "Arquivos criados em $dir" -ForegroundColor Green

# Teste e sincronismo
npm run build

git add src/shared/products
git commit -m "feat(produtos): etapa 2 parte 2 - tipos e servicos"
git push

