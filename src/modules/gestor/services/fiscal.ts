import { supabase } from '@/lib/supabase';

export { onlyDigits, isValidNcm, isValidCest, formatNcm, formatCest } from '@/shared/products/fiscalFormat';

const sb: any = supabase;

export interface FiscalRow {
  variant_id: string;
  sku: string;
  product_id: string;
  product_name: string;
  ncm: string | null;
  cest: string | null;
  ncm_source: 'variacao' | 'produto' | null;
  ncm_ok: boolean;
  cest_ok: boolean;
}

export interface FiscalIssue { sku: string; product_name: string; motivo: string }

// Variacoes da loja com NCM ou CEST invalido/ausente
export async function listFiscalPendencies(storeId: string): Promise<FiscalRow[]> {
  const out: FiscalRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('gestor_variant_fiscal')
      .select('*')
      .eq('store_id', storeId)
      .or('ncm_ok.eq.false,cest_ok.eq.false')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data || []) as FiscalRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// Confere os SKUs de uma nota antes de emitir. ok=false bloqueia a emissao.
export async function checkSkusFiscal(storeId: string, skus: string[]): Promise<{ ok: boolean; issues: FiscalIssue[] }> {
  const unique = Array.from(new Set(skus.map((s) => s.trim()).filter(Boolean)));
  const found = new Map<string, FiscalRow>();
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await sb
      .from('gestor_variant_fiscal')
      .select('*')
      .eq('store_id', storeId)
      .in('sku', unique.slice(i, i + 200));
    if (error) throw new Error(error.message);
    ((data || []) as FiscalRow[]).forEach((r) => found.set(r.sku, r));
  }
  const issues: FiscalIssue[] = [];
  for (const sku of unique) {
    const r = found.get(sku);
    if (!r) { issues.push({ sku, product_name: '-', motivo: 'SKU não cadastrado no catálogo' }); continue; }
    if (!r.ncm) issues.push({ sku, product_name: r.product_name, motivo: 'NCM não informado' });
    else if (!r.ncm_ok) issues.push({ sku, product_name: r.product_name, motivo: 'NCM deve ter 8 dígitos' });
    if (!r.cest_ok) issues.push({ sku, product_name: r.product_name, motivo: 'CEST deve ter 7 dígitos' });
  }
  return { ok: issues.length === 0, issues };
}