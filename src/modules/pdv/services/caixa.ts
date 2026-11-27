import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface CashTotals {
  opening: number; cash_sales: number; supplies: number; withdrawals: number; sales_count: number; expected: number;
}

export interface CashSession {
  id: string;
  store_id: string;
  channel: string;
  opened_at: string;
  opening_amount: number;
  status: 'open' | 'closed';
  closed_at: string | null;
  counted_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  close_note: string | null;
  totals?: CashTotals;
}

export interface CashMove {
  id: string;
  kind: 'sangria' | 'suprimento';
  amount: number;
  reason: string | null;
  created_at: string;
}

export interface CloseResult { expected: number; counted: number; difference: number; totals: CashTotals }

const num = (v: unknown) => Number(v ?? 0);
const numOrNull = (v: unknown) => (v == null ? null : Number(v));

function toTotals(t: any): CashTotals | undefined {
  if (!t) return undefined;
  return {
    opening: num(t.opening), cash_sales: num(t.cash_sales), supplies: num(t.supplies),
    withdrawals: num(t.withdrawals), sales_count: num(t.sales_count), expected: num(t.expected),
  };
}

function toSession(r: any): CashSession {
  return {
    id: r.id, store_id: r.store_id, channel: r.channel, opened_at: r.opened_at,
    opening_amount: num(r.opening_amount), status: r.status, closed_at: r.closed_at ?? null,
    counted_amount: numOrNull(r.counted_amount), expected_amount: numOrNull(r.expected_amount),
    difference: numOrNull(r.difference), close_note: r.close_note ?? null, totals: toTotals(r.totals),
  };
}

/** Caixa aberto do usuario logado na loja fisica (null = nenhum). */
export async function cashCurrent(storeId: string, channel: string): Promise<CashSession | null> {
  const { data, error } = await sb.rpc('gestor_cash_current', { p_store: storeId, p_channel: channel });
  if (error) throw new Error(error.message);
  return data ? toSession(data) : null;
}

export async function cashOpen(storeId: string, channel: string, amount: number, idem: string): Promise<string> {
  const { data, error } = await sb.rpc('gestor_cash_open', {
    p_store: storeId, p_channel: channel, p_amount: amount, p_opened_at: null, p_idem: idem,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cashMove(
  sessionId: string, kind: 'sangria' | 'suprimento', amount: number, reason: string, idem: string,
): Promise<void> {
  const { error } = await sb.rpc('gestor_cash_move', {
    p_session: sessionId, p_kind: kind, p_amount: amount, p_reason: reason || null, p_at: null, p_idem: idem,
  });
  if (error) throw new Error(error.message);
}

export async function cashClose(sessionId: string, counted: number, note: string, idem: string): Promise<CloseResult> {
  const { data, error } = await sb.rpc('gestor_cash_close', {
    p_session: sessionId, p_counted: counted, p_closed_at: null, p_note: note || null, p_idem: idem,
  });
  if (error) throw new Error(error.message);
  const d: any = data || {};
  return {
    expected: num(d.expected), counted: num(d.counted), difference: num(d.difference),
    totals: toTotals(d.totals) ?? { opening: 0, cash_sales: 0, supplies: 0, withdrawals: 0, sales_count: 0, expected: num(d.expected) },
  };
}

export async function listCashSessions(storeId: string, limit = 15): Promise<CashSession[]> {
  const { data, error } = await sb
    .from('gestor_cash_sessions')
    .select('*')
    .eq('store_id', storeId)
    .order('opened_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map(toSession);
}

export async function listCashMoves(sessionId: string): Promise<CashMove[]> {
  const { data, error } = await sb
    .from('gestor_cash_movements')
    .select('id,kind,amount,reason,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((r) => ({ ...r, amount: num(r.amount) })) as CashMove[];
}