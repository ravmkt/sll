import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export const EXP_PAGE_SIZE = 25;

export type Stage = 'pending' | 'separating' | 'shipped' | 'delivered';

export interface ExpItem { sku: string | null; name: string | null; qty: number }

export interface ExpRow {
  id: string;
  number: number | string;
  created_at: string;
  paid_at: string | null;
  channel: string | null;
  total: number;
  shipping_service: string | null;
  shipping_provider: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  internal_note: string | null;
  customer_name: string | null;
  address: Record<string, any> | null;
  items: ExpItem[];
}

export interface ExpList {
  counts: Partial<Record<Stage, number>>;
  total: number;
  rows: ExpRow[];
}

export async function listExpedicao(storeId: string, stage: Stage, search: string, page: number): Promise<ExpList> {
  const { data, error } = await sb.rpc('gestor_expedicao_list', {
    p_store: storeId,
    p_stage: stage,
    p_search: search.trim() || null,
    p_limit: EXP_PAGE_SIZE,
    p_offset: page * EXP_PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data as ExpList;
}

export async function advanceOrders(ids: string[], status: 'pending' | 'separating' | 'delivered'): Promise<number> {
  const { data, error } = await sb.rpc('gestor_expedicao_advance', { p_orders: ids, p_status: status });
  if (error) throw new Error(error.message);
  return Number(data || 0);
}

export async function dispatchOrder(
  id: string, provider: string, service: string, tracking: string, trackingUrl: string,
): Promise<void> {
  const { error } = await sb.rpc('gestor_expedicao_dispatch', {
    p_order: id, p_provider: provider, p_service: service, p_tracking: tracking, p_tracking_url: trackingUrl,
  });
  if (error) throw new Error(error.message);
}

export const isPickup = (service: string | null | undefined) => /retir/i.test(service || '');

export function cityUf(a: Record<string, any> | null): string {
  if (!a) return '-';
  const uf = a.uf || (typeof a.state === 'string' && a.state.length === 2 ? a.state : '');
  return [a.city, uf].filter(Boolean).join('/') || '-';
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildPickingHtml(rows: ExpRow[]): string {
  const agg = new Map<string, { sku: string; name: string; qty: number }>();
  for (const r of rows) {
    for (const i of r.items) {
      const key = i.sku || i.name || '-';
      const cur = agg.get(key) || { sku: i.sku || '-', name: i.name || '-', qty: 0 };
      cur.qty += Number(i.qty || 0);
      agg.set(key, cur);
    }
  }
  const total = [...agg.values()].sort((a, b) => a.sku.localeCompare(b.sku))
    .map((i) => `<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td class="n">${i.qty}</td></tr>`).join('');
  const orders = rows.map((r) => `
    <h3>Pedido #${esc(r.number)} - ${esc(r.customer_name || '-')} - ${esc(cityUf(r.address))}
      <small>${esc(r.shipping_service || '')}</small></h3>
    <table><tbody>${r.items.map((i) => `<tr><td>${esc(i.sku || '-')}</td><td>${esc(i.name || '-')}</td><td class="n">${Number(i.qty || 0)}</td></tr>`).join('')}</tbody></table>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Lista de separacao</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#111}h1{font-size:18px}h2{font-size:15px;margin-top:20px}
h3{font-size:13px;margin:16px 0 4px}h3 small{color:#666;font-weight:normal}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}.n{text-align:right;width:60px}</style></head><body>
<h1>Lista de separacao - ${rows.length} pedido(s)</h1>
<h2>Total por item</h2>
<table><thead><tr><th>SKU</th><th>Produto</th><th class="n">Qtd</th></tr></thead><tbody>${total}</tbody></table>
<h2>Por pedido</h2>${orders}</body></html>`;
}