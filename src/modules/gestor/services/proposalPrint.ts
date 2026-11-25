import { brl, fmtDay } from './propostas';
import type { Proposal, ProposalItem } from './propostas';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderProposalHtml(p: Proposal, items: ProposalItem[], storeName: string, sellerName: string): string {
  const rows = items.map((i) => `
    <tr>
      <td class="ph">${i.image_url ? `<img src="${esc(i.image_url)}" alt="" />` : ''}</td>
      <td>${esc(i.name)}${i.sku ? `<div class="sku">${esc(i.sku)}</div>` : ''}</td>
      <td class="c">${i.qty}</td>
      <td class="r">${brl(i.unit_price)}</td>
      <td class="r">${i.discount ? brl(i.discount) : '-'}</td>
      <td class="r"><b>${brl(i.total)}</b></td>
    </tr>`).join('');

  const info = [
    ['Cliente', p.customer_name],
    ['Telefone', p.customer_phone || ''],
    ['E-mail', p.customer_email || ''],
    ['Vendedor', sellerName],
    ['Emitida em', fmtDay(p.created_at)],
    ['Válida até', p.valid_until ? fmtDay(p.valid_until) : ''],
  ].filter((r) => r[1]).map((r) => `<div><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>Proposta #${p.number}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: black; font-size: 12px; margin: 0; }
  h1 { font-size: 20px; margin: 0; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 14px; }
  .top small { color: gray; font-size: 12px; }
  .info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; margin-bottom: 16px; }
  .info span { display: block; color: gray; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; color: gray; border-bottom: 1px solid black; padding: 6px 4px; }
  td { border-bottom: 1px solid lightgray; padding: 6px 4px; vertical-align: middle; }
  td.ph { width: 52px; }
  td.ph img { width: 44px; height: 44px; object-fit: cover; border: 1px solid lightgray; border-radius: 4px; display: block; }
  .sku { color: gray; font-size: 10px; font-family: monospace; }
  .c { text-align: center; } .r { text-align: right; }
  .tot { margin: 14px 0 0 auto; width: 260px; }
  .tot div { display: flex; justify-content: space-between; padding: 3px 0; }
  .tot .g { border-top: 2px solid black; margin-top: 4px; padding-top: 6px; font-size: 15px; font-weight: bold; }
  .box { margin-top: 16px; border: 1px solid lightgray; border-radius: 6px; padding: 10px; white-space: pre-wrap; }
  .box span { display: block; color: gray; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; }
  tr { page-break-inside: avoid; }
</style></head>
<body>
  <div class="top">
    <div><h1>${esc(storeName) || 'Proposta comercial'}</h1><small>Proposta comercial</small></div>
    <div style="text-align:right"><h1>#${p.number}</h1></div>
  </div>
  <div class="info">${info}</div>
  <table>
    <thead><tr><th></th><th>Item</th><th class="c">Qtd</th><th class="r">Unitário</th><th class="r">Desconto</th><th class="r">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="tot">
    <div><span>Subtotal</span><span>${brl(p.subtotal)}</span></div>
    ${p.discount ? `<div><span>Desconto</span><span>- ${brl(p.discount)}</span></div>` : ''}
    ${p.shipping_cost ? `<div><span>Frete</span><span>${brl(p.shipping_cost)}</span></div>` : ''}
    <div class="g"><span>Total</span><span>${brl(p.total)}</span></div>
  </div>
  ${p.payment_terms ? `<div class="box"><span>Condições de pagamento</span>${esc(p.payment_terms)}</div>` : ''}
  ${p.notes ? `<div class="box"><span>Observações</span>${esc(p.notes)}</div>` : ''}
  <script>
    window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 250); };
  </script>
</body></html>`;
}

/** Escreve a proposta na janela ja aberta (aberta antes do await para nao ser bloqueada) e imprime. */
export function printProposal(w: Window, p: Proposal, items: ProposalItem[], storeName: string, sellerName: string) {
  w.document.open();
  w.document.write(renderProposalHtml(p, items, storeName, sellerName));
  w.document.close();
}