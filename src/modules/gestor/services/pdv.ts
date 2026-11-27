import { supabase } from '@/lib/supabase';
import { setOrderOrigin } from './canaisVenda';
import type { SaleOrigin } from './canaisVenda';
import { assertOfflineSale, consumeCachedStock, queueSale } from './pdvOffline';
import type { NewCustomer } from './pdvOffline';
import { isNetworkFailure, withTimeout } from './pdvNet';

const sb: any = supabase;

export type PdvMethod = 'cash' | 'pix' | 'debit' | 'credit' | 'transfer' | 'other' | 'receivable';

export interface PdvItemInput { variant_id: string; qty: number; unit_price: number; discount?: number }
export interface PdvPaymentInput { method: PdvMethod; amount: number; installments?: number; cash_given?: number }

export interface PdvSaleInput {
  storeId: string;
  customerId?: string | null;
  items: PdvItemInput[];
  discount?: number;
  shipping?: number;
  payments: PdvPaymentInput[];
  sendToExpedition?: boolean;
  sellerId?: string | null;
  warehouseId?: string | null;
  note?: string | null;
  idemKey: string;
  channel?: string | null;
  origin?: SaleOrigin | null;
  /** Cliente novo digitado (CPF/WhatsApp). So e usado se a venda cair na fila offline. */
  newCustomer?: NewCustomer | null;
}

export interface PdvSaleResult {
  order_id: string;
  number: number;
  total: number;
  interest_total: number;
  change_amount: number;
  duplicate: boolean;
  /** true = venda salva na fila deste aparelho (sem internet). number vem 0. */
  queued?: boolean;
  /** Numero provisorio (OFF-...) da venda na fila. */
  provisional?: string | null;
}

export interface PdvSettings { default_warehouse_id: string | null; max_interest_free: number; receipt_width_mm: 58 | 80 }
export interface PdvCardFee { method: 'debit' | 'credit'; installments: number; fee_pct: number }
export interface PdvCharge { fee_pct: number; interest: number; charged: number }

export const newSaleKey = (): string => crypto.randomUUID();

const SALE_TIMEOUT_MS = 8000;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Salva a venda na fila local, com a MESMA chave de idempotencia (se o servidor ja recebeu, nao duplica). */
async function enqueueSale(i: PdvSaleInput): Promise<PdvSaleResult> {
  const off = {
    storeId: i.storeId,
    customerId: i.customerId ?? null,
    newCustomer: i.newCustomer ?? null,
    items: i.items,
    discount: i.discount ?? 0,
    shipping: i.shipping ?? 0,
    payments: i.payments,
    sendToExpedition: !!i.sendToExpedition,
    sellerId: i.sellerId ?? null,
    warehouseId: i.warehouseId ?? null,
    note: i.note ?? null,
    channel: i.channel || 'pdv',
    origin: i.origin ?? null,
    idem: i.idemKey,
  };
  await assertOfflineSale(off);
  const item = await queueSale(off);
  await consumeCachedStock(i.storeId, i.warehouseId, i.items);

  const subtotal = i.items.reduce((s, x) => s + Number(x.unit_price) * Number(x.qty) - Number(x.discount ?? 0), 0);
  const total = r2(subtotal - Number(i.discount ?? 0) + Number(i.shipping ?? 0));
  const cash = i.payments.find((p) => p.method === 'cash');
  const change = cash && cash.cash_given ? r2(Math.max(Number(cash.cash_given) - total, 0)) : 0;
  return {
    order_id: '', number: 0, total, interest_total: 0, change_amount: change,
    duplicate: false, queued: true, provisional: item.provisional ?? null,
  };
}

export async function createPdvSale(i: PdvSaleInput): Promise<PdvSaleResult> {
  if (!navigator.onLine) return enqueueSale(i);

  let res: PdvSaleResult;
  try {
    const call = Promise.resolve(sb.rpc('gestor_pdv_sale_sync', {
      p_store: i.storeId,
      p_customer: i.customerId ?? null,
      p_items: i.items,
      p_discount: i.discount ?? 0,
      p_shipping: i.shipping ?? 0,
      p_payments: i.payments,
      p_send_to_expedition: !!i.sendToExpedition,
      p_seller: i.sellerId ?? null,
      p_warehouse: i.warehouseId ?? null,
      p_note: i.note ?? null,
      p_idem: i.idemKey,
      p_channel: i.channel || 'pdv',
    }));
    const { data, error } = await withTimeout(call, SALE_TIMEOUT_MS) as { data: unknown; error: { message: string } | null };
    if (error) throw new Error(error.message);
    res = data as PdvSaleResult;
  } catch (e) {
    // So queda de rede/timeout vai para a fila. Erro de regra (saldo, permissao) aparece para o operador.
    if (isNetworkFailure(e)) return enqueueSale(i);
    throw e instanceof Error ? e : new Error(String(e));
  }

  if (i.origin && res?.order_id) {
    try { await setOrderOrigin(res.order_id, i.origin); }
    catch (e) { console.warn('[PDV] origem não gravada:', e); }
  }
  return res;
}
export async function previewCharge(storeId: string, method: PdvMethod, installments: number, amount: number): Promise<PdvCharge> {
  const { data, error } = await sb.rpc('gestor_pdv_charge', {
    p_store: storeId, p_method: method, p_installments: installments, p_amount: amount,
  });
  if (error) throw new Error(error.message);
  const r = Array.isArray(data) ? data[0] : data;
  return { fee_pct: Number(r?.fee_pct ?? 0), interest: Number(r?.interest ?? 0), charged: Number(r?.charged ?? amount) };
}

export async function loadPdvConfig(storeId: string): Promise<{ settings: PdvSettings; fees: PdvCardFee[] }> {
  const [s, f] = await Promise.all([
    sb.from('gestor_pdv_settings').select('default_warehouse_id,max_interest_free,receipt_width_mm').eq('store_id', storeId).maybeSingle(),
    sb.from('gestor_pdv_card_fees').select('method,installments,fee_pct').eq('store_id', storeId).order('installments'),
  ]);
  if (s.error) throw new Error(s.error.message);
  if (f.error) throw new Error(f.error.message);
  return {
    settings: s.data ?? { default_warehouse_id: null, max_interest_free: 1, receipt_width_mm: 80 },
    fees: (f.data ?? []) as PdvCardFee[],
  };
}