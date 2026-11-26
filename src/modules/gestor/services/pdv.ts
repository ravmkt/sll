import { supabase } from '@/lib/supabase';

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
}

export interface PdvSaleResult {
  order_id: string;
  number: number;
  total: number;
  interest_total: number;
  change_amount: number;
  duplicate: boolean;
}

export interface PdvSettings { default_warehouse_id: string | null; max_interest_free: number; receipt_width_mm: 58 | 80 }
export interface PdvCardFee { method: 'debit' | 'credit'; installments: number; fee_pct: number }
export interface PdvCharge { fee_pct: number; interest: number; charged: number }

export const newSaleKey = (): string => crypto.randomUUID();

export async function createPdvSale(i: PdvSaleInput): Promise<PdvSaleResult> {
  const { data, error } = await sb.rpc('gestor_pdv_sale', {
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
  });
  if (error) throw new Error(error.message);
  return data as PdvSaleResult;
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