import { supabase } from '@/lib/supabase';
import { brl, customerName, fmtDate, getOrder, pick } from './pedidos';
import type { OrderDetail } from './pedidos';

const sb: any = supabase;

export type BulkStatus = 'pending' | 'separating' | 'shipped' | 'delivered';

async function pool<T>(list: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) await fn(list[i++]);
  }));
}

/** Altera o status de expedicao de varios pedidos (mantem rastreio e observacao). */
export async function setStatusMany(ids: string[], status: BulkStatus): Promise<{ ok: number; failed: number; reason: string }> {
  let ok = 0, failed = 0, reason = '';
  await pool(ids, 4, async (id) => {
    const { error } = await sb.rpc('gestor_order_set_fulfillment', {
      p_order: id, p_status: status, p_tracking: null, p_tracking_url: null, p_note: null,
    });
    if (error) { failed++; reason = reason || error.message; } else ok++;
  });
  return { ok, failed, reason };
}

/** Exclui pedidos (e itens). Lanca erro se algum nao puder ser excluido. */
export async function deleteOrders(ids: string[]): Promise<number> {
  const { data, error } = await sb.rpc('gestor_orders_delete', { p_orders: ids });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function fetchDetails(ids: string[]): Promise<OrderDetail[]> {
  const out: (OrderDetail | null)[] = new Array(ids.length).fill(null);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (i < ids.length) {
      const k = i++;
      try { out[k] = await getOrder(ids[k]); } catch { out[k] = null; }
    }
  }));
  return out.filter((x): x is OrderDetail => !!x);
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildOrdersHtml(list: OrderDetail[]): string {
  const pages = list.map(({ order: o, customer, items }) => {
    const a: Record<string, any> = o.shipping_address && typeof o.shipping_address === 'object' ? o.shipping_address : {};
    const l1 = [a.street, a.number, a.complement].filter(Boolean).join(', ');
    const l2 = [a.neighborhood || a.district, [a.city, a.uf || a.state].filter(Boolean).join('/')].filter(Boolean).join(' - ');
    const zip = a.zipcode || a.zip || '';
    const rows = items.map((i) => {
      const qty = Number(i.qty || 0);
      const unit = Number(pick(i, 'unit_price', 'price') || 0);
      return `<tr><td>${esc(i.sku || '-')}</td><td>${esc(pick(i, 'name', 'title', 'product_name') || '-')}</td><td class="n">${qty}</td><td class="n">${esc(brl(unit))}</td><td class="n">${esc(brl(unit * qty))}</td></tr>`;
    }).join('');
    return `<section>
<h1>Pedido #${esc(pick(o, 'number', 'external_id'))} <small>${esc(o.channel || '')}</small></h1>
<p class="m">Criado em ${esc(fmtDate(pick(o, 'created_at', 'ordered_at')))}${o.shipping_service ? ' · ' + esc(o.shipping_service) : ''}${o.tracking_code ? ' · Rastreio ' + esc(o.tracking_code) : ''}</p>
<div class="g"><div><h2>Cliente</h2><p>${esc(customerName(o, customer))}</p><p class="m">${esc([pick(customer, 'email'), pick(customer, 'phone', 'whatsapp')].filter(Boolean).join(' · '))}</p></div>
<div><h2>Entrega</h2><p>${esc(l1 || '-')}</p><p class="m">${esc(l2)}${zip ? ' · CEP ' + esc(zip) : ''}</p></div></div>
<table><thead><tr><th>SKU</th><th>Produto</th><th class="n">Qtd</th><th class="n">Unitário</th><th class="n">Subtotal</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sem itens.</td></tr>'}</tbody></table>
<p class="t">Produtos: ${esc(brl(o.subtotal))} · Desconto: ${esc(brl(o.discount))} · Frete: ${esc(brl(o.shipping_cost))}<br><b>Total: ${esc(brl(o.total))}</b></p>
</section>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedidos</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:0;color:#111}section{padding:24px;page-break-after:always}section:last-child{page-break-after:auto}
h1{font-size:18px;margin:0 0 4px}h1 small{font-size:12px;color:#666;font-weight:normal}h2{font-size:12px;text-transform:uppercase;color:#666;margin:12px 0 2px}
p{margin:2px 0}.m{color:#666}.g{display:grid;grid-template-columns:1fr 1fr;gap:16px}table{border-collapse:collapse;width:100%;margin-top:14px}
td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}.n{text-align:right}.t{text-align:right;margin-top:10px}</style></head><body>${pages}</body></html>`;
}