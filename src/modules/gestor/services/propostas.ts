import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type ProposalStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  approved: 'Aprovada',
  rejected: 'Recusada',
  expired: 'Expirada',
  converted: 'Convertida',
};

// Cores semanticas (podem ficar fixas); rascunho usa neutro.
export const PROPOSAL_STATUS_CLS: Record<ProposalStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  sent: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  expired: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  converted: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

export const PROPOSAL_STATUSES = Object.keys(PROPOSAL_STATUS_LABEL) as ProposalStatus[];

/** Transicoes aceitas pela RPC gestor_proposal_set_status. */
export const PROPOSAL_TRANSITIONS: Record<ProposalStatus, { to: ProposalStatus; label: string }[]> = {
  draft: [{ to: 'sent', label: 'Marcar como enviada' }],
  sent: [
    { to: 'approved', label: 'Aprovar' },
    { to: 'rejected', label: 'Recusar' },
    { to: 'draft', label: 'Voltar a rascunho' },
  ],
  expired: [{ to: 'sent', label: 'Reenviar' }, { to: 'draft', label: 'Reabrir' }],
  approved: [{ to: 'draft', label: 'Reabrir' }],
  rejected: [{ to: 'draft', label: 'Reabrir' }],
  converted: [],
};

export const canEditProposal = (s: ProposalStatus) => s === 'draft' || s === 'sent' || s === 'expired';
export const canConvertProposal = (s: ProposalStatus) => s === 'approved';
export const canDeleteProposal = (s: ProposalStatus) => s === 'draft';

export interface Proposal {
  id: string;
  store_id: string;
  number: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  seller_id: string | null;
  status: ProposalStatus;
  valid_until: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  payment_terms: string | null;
  notes: string | null;
  order_id: string | null;
  sent_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  product_id: string | null;
  variant_id: string | null;
  sku: string | null;
  name: string;
  qty: number;
  unit_price: number;
  discount: number;
  total: number;
  position: number;
}

export interface ProposalHeaderForm {
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  seller_id: string | null;
  valid_until: string;
  payment_terms: string;
  notes: string;
  discount: number;
  shipping_cost: number;
}

export interface ProposalItemForm {
  product_id: string | null;
  variant_id: string | null;
  sku: string;
  name: string;
  qty: number;
  unit_price: number;
  discount: number;
}

export interface ProposalFilters {
  from?: string | null; // ISO inclusivo
  to?: string | null;   // ISO exclusivo
  status?: ProposalStatus | 'all';
  sellerId?: string | 'all';
  search?: string;
}

const num = (v: unknown) => Number(v ?? 0);
const msg = (e: { message?: string } | null) => e?.message || 'Erro inesperado.';

const toProposal = (r: any): Proposal => ({
  ...r,
  number: num(r.number),
  subtotal: num(r.subtotal),
  discount: num(r.discount),
  shipping_cost: num(r.shipping_cost),
  total: num(r.total),
});

const toItem = (r: any): ProposalItem => ({
  ...r,
  qty: num(r.qty),
  unit_price: num(r.unit_price),
  discount: num(r.discount),
  total: num(r.total),
});

export const brl = (v: number) => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Data do dia (sem fuso). */
export const fmtDay = (v: string | null | undefined) => {
  if (!v) return '-';
  const [y, m, d] = v.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '-';
};

export const itemTotal = (i: Pick<ProposalItemForm, 'qty' | 'unit_price' | 'discount'>) =>
  Math.max(i.qty * i.unit_price - i.discount, 0);

export function calcTotals(items: ProposalItemForm[], discount: number, shipping: number) {
  const subtotal = items.reduce((s, i) => s + itemTotal(i), 0);
  return { subtotal, total: Math.max(subtotal - discount, 0) + shipping };
}

export const isExpiredDate = (p: Pick<Proposal, 'status' | 'valid_until'>) =>
  p.status === 'sent' && !!p.valid_until && p.valid_until < new Date().toLocaleDateString('sv-SE');

/** Expira propostas enviadas vencidas. Sem permissao, ignora em silencio. */
export async function expireProposals(storeId: string): Promise<number> {
  try {
    const { data, error } = await sb.rpc('gestor_proposal_expire', { p_store: storeId });
    if (error) return 0;
    return Number(data || 0);
  } catch {
    return 0;
  }
}

export async function listProposals(storeId: string, f: ProposalFilters = {}): Promise<Proposal[]> {
  const out: Proposal[] = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from('proposals').select('*').eq('store_id', storeId)
      .order('created_at', { ascending: false }).range(from, from + 999);
    if (f.from) q = q.gte('created_at', f.from);
    if (f.to) q = q.lt('created_at', f.to);
    if (f.status && f.status !== 'all') q = q.eq('status', f.status);
    if (f.sellerId && f.sellerId !== 'all') q = q.eq('seller_id', f.sellerId);
    const { data, error } = await q;
    if (error) throw new Error(msg(error));
    out.push(...((data || []) as any[]).map(toProposal));
    if (!data || data.length < 1000) break;
  }
  const s = (f.search || '').trim().toLowerCase();
  if (!s) return out;
  return out.filter((p) =>
    p.customer_name.toLowerCase().includes(s) || String(p.number).includes(s.replace('#', '')));
}

export async function getProposal(id: string): Promise<{ proposal: Proposal; items: ProposalItem[] }> {
  const { data: p, error } = await sb.from('proposals').select('*').eq('id', id).single();
  if (error) throw new Error(msg(error));
  const { data: it, error: e2 } = await sb.from('proposal_items').select('*')
    .eq('proposal_id', id).order('position', { ascending: true });
  if (e2) throw new Error(msg(e2));
  return { proposal: toProposal(p), items: ((it || []) as any[]).map(toItem) };
}

export function validateProposal(h: ProposalHeaderForm, items: ProposalItemForm[]): string | null {
  if (!h.customer_name.trim()) return 'Informe o cliente.';
  if (items.length === 0) return 'Adicione ao menos um item.';
  if (items.some((i) => !i.name.trim() || i.qty < 1)) return 'Confira nome e quantidade dos itens.';
  if (items.some((i) => i.unit_price < 0 || i.discount < 0)) return 'Preço e desconto não podem ser negativos.';
  if (h.discount < 0 || h.shipping_cost < 0) return 'Desconto e frete não podem ser negativos.';
  return null;
}

/** Cria (id = null) ou edita. Totais sao recalculados no servidor. */
export async function saveProposal(
  storeId: string, id: string | null, h: ProposalHeaderForm, items: ProposalItemForm[],
): Promise<string> {
  const bad = validateProposal(h, items);
  if (bad) throw new Error(bad);
  const { data, error } = await sb.rpc('gestor_proposal_save', {
    p_store: storeId,
    p_id: id,
    p_header: { ...h, customer_name: h.customer_name.trim() },
    p_items: items.map((i) => ({ ...i, name: i.name.trim() })),
  });
  if (error) throw new Error(msg(error));
  return data as string;
}

export async function setProposalStatus(id: string, status: ProposalStatus): Promise<void> {
  const { error } = await sb.rpc('gestor_proposal_set_status', { p_id: id, p_status: status });
  if (error) throw new Error(msg(error));
}

/** Retorna o id do pedido criado. */
export async function convertProposal(id: string): Promise<string> {
  const { data, error } = await sb.rpc('gestor_proposal_convert', { p_id: id });
  if (error) throw new Error(msg(error));
  return data as string;
}

/** Copia a proposta como novo rascunho, sem validade. Retorna o id novo. */
export async function duplicateProposal(storeId: string, id: string): Promise<string> {
  const { proposal: p, items } = await getProposal(id);
  return saveProposal(storeId, null, {
    customer_id: p.customer_id,
    customer_name: p.customer_name,
    customer_phone: p.customer_phone || '',
    customer_email: p.customer_email || '',
    seller_id: p.seller_id,
    valid_until: '',
    payment_terms: p.payment_terms || '',
    notes: p.notes || '',
    discount: p.discount,
    shipping_cost: p.shipping_cost,
  }, items.map((i) => ({
    product_id: i.product_id, variant_id: i.variant_id, sku: i.sku || '',
    name: i.name, qty: i.qty, unit_price: i.unit_price, discount: i.discount,
  })));
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await sb.from('proposals').delete().eq('id', id).eq('status', 'draft');
  if (error) throw new Error(msg(error));
}

const digits = (s: string) => s.replace(/\D/g, '');

/** Mensagem pronta para WhatsApp. */
export function whatsappLink(p: Proposal, items: ProposalItem[]): string | null {
  const phone = digits(p.customer_phone || '');
  if (!phone) return null;
  const lines = items.map((i) => `• ${i.qty}x ${i.name} — ${brl(i.total)}`).join('\n');
  const text = [
    `Olá, ${p.customer_name}! Segue a proposta #${p.number}:`,
    lines,
    p.shipping_cost ? `Frete: ${brl(p.shipping_cost)}` : '',
    `*Total: ${brl(p.total)}*`,
    p.valid_until ? `Válida até ${fmtDay(p.valid_until)}.` : '',
  ].filter(Boolean).join('\n');
  const full = phone.length <= 11 ? `55${phone}` : phone;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(p: Proposal, items: ProposalItem[]): string | null {
  if (!p.customer_email) return null;
  const lines = items.map((i) => `${i.qty}x ${i.name} - ${brl(i.total)}`).join('\n');
  const body = `Olá, ${p.customer_name}!\n\nSegue a proposta #${p.number}:\n\n${lines}\n\nTotal: ${brl(p.total)}${p.valid_until ? `\nVálida até ${fmtDay(p.valid_until)}.` : ''}`;
  return `mailto:${p.customer_email}?subject=${encodeURIComponent(`Proposta #${p.number}`)}&body=${encodeURIComponent(body)}`;
}