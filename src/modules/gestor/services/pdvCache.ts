import type { CatalogProduct } from '@/services/productsService';
import type { VariantRow } from '@/components/products/variantsData';
import { getFinConfig } from './financeiro';
import type { FinConfig } from './financeiro';
import { loadCache, saveCache } from './pdvOffline';
import { loadCompanyBrief } from './pdvVenda';
import type { CompanyBrief, StockMap } from './pdvVenda';

type Snap = {
  products: CatalogProduct[];
  variants: [string, VariantRow[]][];
  stock: [string, Record<string, number>][];
};

const key = {
  snap: (s: string) => 'catalog:' + s,
  fin: (s: string, c: string) => 'fin:' + s + ':' + c,
  company: (s: string) => 'company:' + s,
};

/** Guarda so o que a tela de venda usa (catalogo enxuto). */
export async function saveSnapshot(
  storeId: string, products: CatalogProduct[], variants: Map<string, VariantRow[]>, stock: StockMap,
): Promise<void> {
  const slim = products.map((p) => ({
    id: p.id, name: p.name, sku: p.sku, category: p.category, price: p.price, image_url: p.image_url, active: p.active,
  })) as unknown as CatalogProduct[];
  await saveCache<Snap>(key.snap(storeId), {
    products: slim,
    variants: Array.from(variants.entries()),
    stock: Array.from(stock.entries()),
  });
}

export async function loadSnapshot(storeId: string) {
  const c = await loadCache<Snap>(key.snap(storeId));
  if (!c) return null;
  return {
    products: c.value.products,
    variants: new Map(c.value.variants) as Map<string, VariantRow[]>,
    stock: new Map(c.value.stock) as StockMap,
    savedAt: c.savedAt,
  };
}

/** Online: busca e guarda. Sem rede (ou falha): usa o que foi guardado. null = nada guardado. */
export async function finCached(storeId: string, channel: string): Promise<FinConfig | null> {
  const k = key.fin(storeId, channel);
  if (navigator.onLine) {
    try {
      const c = await getFinConfig(storeId, channel);
      await saveCache(k, c);
      return c;
    } catch (e) {
      const cached = await loadCache<FinConfig>(k);
      if (cached) return cached.value;
      throw e;
    }
  }
  return (await loadCache<FinConfig>(k))?.value ?? null;
}

const EMPTY: CompanyBrief = { name: '', cnpj: '', phone: '', logo: '' };

export async function companyBriefCached(storeId: string): Promise<CompanyBrief> {
  const k = key.company(storeId);
  if (navigator.onLine) {
    const c = await loadCompanyBrief(storeId);
    if (c.name || c.cnpj || c.phone || c.logo) {
      await saveCache(k, c);
      return c;
    }
  }
  return (await loadCache<CompanyBrief>(k))?.value ?? EMPTY;
}