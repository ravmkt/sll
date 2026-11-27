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

export type PrintMode = 'page' | 'flow';

// SLL-LABEL-100x150: 'page' = uma etiqueta 100x150 mm por pedido; 'flow' = A4 corrido
export function buildOrdersHtml(list: OrderDetail[], mode: PrintMode = 'page'): string {
  const sections = list.map(({ order: o, customer, items }) => {
    const a: Record<string, any> = o.shipping_address && typeof o.shipping_address === 'object' ? o.shipping_address : {};
    const l1 = [a.street, a.number, a.complement].filter(Boolean).join(', ');
    const l2 = [a.neighborhood || a.district, [a.city, a.uf || a.state].filter(Boolean).join('/')].filter(Boolean).join(' - ');
    const zip = a.zipcode || a.zip || '';
    const contact = [pick(customer, 'email'), pick(customer, 'phone', 'whatsapp')].filter(Boolean).join(' · ');
    const hasAddress = !!(l1 || l2);

    const rows = items.map((i) => {
      const qty = Number(i.qty || 0);
      const unit = Number(pick(i, 'unit_price', 'price') || 0);
      const name = pick(i, 'name', 'title', 'product_name') || '-';
      return `<div class="it"><div class="nm">${esc(name)}</div><div class="ln"><span class="m">${esc(i.sku || '-')} · ${qty} x ${esc(brl(unit))}</span><b>${esc(brl(unit * qty))}</b></div></div>`;
    }).join('');

    const discount = Number(o.discount || 0);
    const shipping = Number(o.shipping_cost || 0);
    const totals =
      `<div class="tl"><span>Produtos</span><span>${esc(brl(o.subtotal))}</span></div>` +
      (discount > 0 ? `<div class="tl"><span>Desconto</span><span>-${esc(brl(discount))}</span></div>` : '') +
      (shipping > 0 ? `<div class="tl"><span>Frete</span><span>${esc(brl(shipping))}</span></div>` : '') +
      `<div class="tl tot"><span>TOTAL</span><span>${esc(brl(o.total))}</span></div>`;

    return `<section>
<h1>Pedido #${esc(pick(o, 'number', 'external_id'))} <small>${esc(o.channel || '')}</small></h1>
<p class="m">${esc(fmtDate(pick(o, 'created_at', 'ordered_at')))}${o.shipping_service ? ' · ' + esc(o.shipping_service) : ''}${o.tracking_code ? ' · Rastreio ' + esc(o.tracking_code) : ''}</p>
<h2>Cliente</h2><p><b>${esc(customerName(o, customer))}</b></p>${contact ? `<p class="m">${esc(contact)}</p>` : ''}
${hasAddress ? `<h2>Entrega</h2><p>${esc(l1 || '-')}</p><p class="m">${esc(l2)}${zip ? ' · CEP ' + esc(zip) : ''}</p>` : ''}
<h2>Itens</h2>
<div class="its">${rows || '<p class="m">Sem itens.</p>'}</div>
<div class="tls">${totals}</div>
</section>`;
  }).join('');

  const pageCss = mode === 'page'
    ? '@page{size:100mm 150mm;margin:0}body{width:100mm}section{padding:4mm;page-break-after:always;break-after:page}section:last-child{page-break-after:auto;break-after:auto}'
    : '@page{size:A4;margin:10mm}section{padding:8px 0;break-inside:avoid;page-break-inside:avoid;border-bottom:1px dashed gray}section:last-child{border-bottom:0}';
  const fs = mode === 'page' ? 11 : 12;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedidos</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:${fs}px;line-height:1.25;margin:0;color:black}
${pageCss}
h1{font-size:${fs + 4}px;margin:0 0 2px}h1 small{font-size:${fs - 1}px;color:dimgray;font-weight:normal}
h2{font-size:${fs - 2}px;text-transform:uppercase;color:dimgray;margin:7px 0 2px;border-bottom:1px solid silver;padding-bottom:1px}
p{margin:1px 0}.m{color:dimgray}
.its{margin-top:2px}.it{padding:3px 0;border-bottom:1px dotted silver;break-inside:avoid;page-break-inside:avoid}
.nm{font-weight:bold;word-break:break-word}.ln{display:flex;justify-content:space-between;gap:6px;margin-top:1px}
.tls{margin-top:6px}.tl{display:flex;justify-content:space-between;padding:1px 0}
.tot{font-size:${fs + 3}px;font-weight:bold;border-top:1px solid black;margin-top:3px;padding-top:3px}
</style></head><body>${sections}</body></html>`;
}