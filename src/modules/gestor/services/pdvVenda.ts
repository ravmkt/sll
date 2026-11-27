import { supabase } from '@/lib/supabase';
import { brl } from './clientes';

const sb: any = supabase;

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Aceita 1234,56 / 1.234,56 / 1234.56. Vazio ou invalido = 0. */
export function parseMoney(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) && n > 0 ? r2(n) : 0;
}

export const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ---------- estoque por deposito ----------
export type StockMap = Map<string, Record<string, number>>;

export async function loadStockByWarehouse(storeId: string): Promise<StockMap> {
  const out: StockMap = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.rpc('gestor_stock_overview', { p_store: storeId }).range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of (data || []) as any[]) out.set(r.variant_id, (r.by_warehouse || {}) as Record<string, number>);
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ---------- clientes ----------
export interface CustomerHit { id: string; name: string; phone: string | null; document: string | null }

export async function searchCustomers(storeId: string, term: string): Promise<CustomerHit[]> {
  const t = term.trim().replace(/[,()%*]/g, ' ').trim();
  if (t.length < 2) return [];
  const like = `%${t}%`;
  const { data, error } = await sb.from('customers').select('id,name,phone,document')
    .eq('store_id', storeId).or(`name.ilike.${like},phone.ilike.${like},document.ilike.${like}`).limit(8);
  if (error) throw new Error(error.message);
  return (data || []) as CustomerHit[];
}

export async function quickCustomer(storeId: string, f: { name: string; phone: string; document: string }): Promise<CustomerHit> {
  const name = f.name.trim();
  if (!name) throw new Error('Informe o nome do cliente.');
  const { data, error } = await sb.from('customers').insert({
    store_id: storeId, name, phone: f.phone.trim() || null, document: f.document.replace(/\D/g, '') || null, source_platform: 'pdv',
  }).select('id,name,phone,document').single();
  if (error) {
    if (error.code === '23505') throw new Error('Já existe cliente com este documento ou e-mail. Busque-o pelo nome.');
    throw new Error(error.message);
  }
  return data as CustomerHit;
}

// ---------- parcelas ----------
export interface InstallOpt { n: number; per: number; total: number; withInterest: boolean; blocked: boolean }

export function installmentOptions(
  total: number, maxN: number, free: number, minV: number, fees: { installments: number; fee_pct: number }[],
): InstallOpt[] {
  const out: InstallOpt[] = [];
  for (let n = 1; n <= Math.max(1, maxN); n++) {
    const fee = fees.find((f) => f.installments === n)?.fee_pct ?? 0;
    const withInterest = n > free && fee > 0;
    const charged = withInterest ? r2(total / (1 - fee / 100)) : total;
    out.push({ n, per: r2(charged / n), total: charged, withInterest, blocked: n > 1 && r2(total / n) < minV });
  }
  return out;
}

// ---------- empresa (cabecalho do recibo) ----------
export interface CompanyBrief { name: string; cnpj: string; phone: string; logo: string }

export async function loadCompanyBrief(storeId: string): Promise<CompanyBrief> {
  try {
    const { data } = await sb.rpc('gestor_company_get', { p_store: storeId });
    const c = (data as any)?.company ?? {};
    return {
      name: String(c.trade_name || c.legal_name || ''), cnpj: String(c.cnpj || ''),
      phone: String(c.phone || ''), logo: String(c.logo_url || ''),
    };
  } catch {
    return { name: '', cnpj: '', phone: '', logo: '' };
  }
}

// ---------- recibo ----------
export interface Receipt {
  number: number | string;
  date: Date;
  company: CompanyBrief;
  customer: { name: string; phone: string | null; document: string | null } | null;
  items: { name: string; sku: string; qty: number; unit: number }[];
  subtotal: number; discount: number; shipping: number; total: number; interest: number;
  payment: { label: string; installments: number; charged: number; given: number | null; change: number };
  note: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtCnpj = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : v;
};

export function buildReceiptHtml(r: Receipt): string {
  const num = String(r.number).padStart(4, '0');
  const rows = r.items.map((i) => `<tr><td>${esc(i.name)}${i.sku ? `<div class="s">${esc(i.sku)}</div>` : ''}</td><td class="n">${i.qty}</td><td class="n">${esc(brl(i.unit))}</td><td class="n">${esc(brl(i.unit * i.qty))}</td></tr>`).join('');
  const cust = r.customer
    ? `<p><b>Cliente:</b> ${esc(r.customer.name)}${r.customer.document ? ' · CPF/CNPJ ' + esc(r.customer.document) : ''}${r.customer.phone ? ' · ' + esc(r.customer.phone) : ''}</p>`
    : '';
  const pay = r.payment.installments > 1
    ? `${esc(r.payment.label)} em ${r.payment.installments}x de ${esc(brl(r.payment.charged / r.payment.installments))}`
    : esc(r.payment.label);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido #${num}</title>
<style>
@page{size:80mm auto;margin:4mm}
body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0;width:72mm}
h1{font-size:14px;margin:4px 0;text-align:center}.c{text-align:center}.s{color:#555;font-size:10px}
p{margin:2px 0}table{width:100%;border-collapse:collapse;margin:8px 0}
th{font-size:10px;text-align:left;border-bottom:1px solid #000;padding:2px 0}
td{padding:3px 0;border-bottom:1px dashed #bbb;vertical-align:top}.n{text-align:right;white-space:nowrap}
.t{margin-top:6px}.t div{display:flex;justify-content:space-between}.g{font-weight:bold;font-size:14px;border-top:1px solid #000;margin-top:4px;padding-top:4px}
.f{margin-top:10px;text-align:center;font-size:10px;color:#444}img{max-width:40mm;max-height:18mm;display:block;margin:0 auto 4px}
</style></head><body>
${r.company.logo ? `<img src="${esc(r.company.logo)}" alt="">` : ''}
<h1>${esc(r.company.name || 'Recibo de venda')}</h1>
<p class="c s">${r.company.cnpj ? 'CNPJ ' + esc(fmtCnpj(r.company.cnpj)) : ''}${r.company.cnpj && r.company.phone ? ' · ' : ''}${esc(r.company.phone)}</p>
<p><b>Pedido #${num}</b> · ${esc(r.date.toLocaleString('pt-BR'))}</p>
${cust}
<table><thead><tr><th>Item</th><th class="n">Qtd</th><th class="n">Unit.</th><th class="n">Subt.</th></tr></thead><tbody>${rows}</tbody></table>
<div class="t">
<div><span>Subtotal</span><span>${esc(brl(r.subtotal))}</span></div>
${r.discount ? `<div><span>Desconto</span><span>- ${esc(brl(r.discount))}</span></div>` : ''}
${r.shipping ? `<div><span>Frete</span><span>${esc(brl(r.shipping))}</span></div>` : ''}
${r.interest ? `<div><span>Juros do parcelamento</span><span>${esc(brl(r.interest))}</span></div>` : ''}
<div class="g"><span>Total</span><span>${esc(brl(r.total + r.interest))}</span></div>
</div>
<p class="t"><b>Pagamento:</b> ${pay}</p>
${r.payment.given != null ? `<p>Recebido ${esc(brl(r.payment.given))} · Troco ${esc(brl(r.payment.change))}</p>` : ''}
${r.note ? `<p><b>Obs.:</b> ${esc(r.note)}</p>` : ''}
<p class="f">Documento interno - não possui valor fiscal.</p>
</body></html>`;
}