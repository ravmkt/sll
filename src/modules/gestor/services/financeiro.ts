import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type FinMethodKey = 'cash' | 'pix' | 'debit' | 'credit' | 'transfer' | 'receivable';
export type FinScope = 'pdv' | 'ecommerce' | 'both';

export const METHOD_ORDER: FinMethodKey[] = ['cash', 'pix', 'debit', 'credit', 'transfer', 'receivable'];
export const METHOD_LABEL: Record<FinMethodKey, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  debit: 'Cartão de débito',
  credit: 'Cartão de crédito',
  transfer: 'Transferência / boleto',
  receivable: 'A prazo (fiado)',
};
export const SCOPE_LABEL: Record<FinScope, string> = { both: 'PDV e e-commerce', pdv: 'Só PDV', ecommerce: 'Só e-commerce' };

export interface FinMethod { method: FinMethodKey; enabled: boolean; scope: FinScope; discount_pct: number; receive_days: number }
export interface FinSettings {
  max_installments: number; max_interest_free: number; min_installment_value: number;
  pix_key_type: string | null; pix_key: string | null; pix_receiver_name: string | null; pix_city: string | null;
}
export interface FinFee { method: 'debit' | 'credit'; installments: number; fee_pct: number }
export interface FinGateway { provider: string; enabled: boolean; mode: 'test' | 'live'; has_secret: boolean }
export interface FinMap { platform: 'yampi'; platform_method: string; method: FinMethodKey }
export interface FinPayload {
  settings: FinSettings; methods: FinMethod[]; fees: FinFee[]; gateways: FinGateway[]; platform_map: FinMap[];
}
export interface FinConfig extends FinPayload { can_edit: boolean }

export async function getFinConfig(storeId: string): Promise<FinConfig> {
  const { data, error } = await sb.rpc('gestor_fin_get', { p_store: storeId });
  if (error) throw new Error(error.message);
  const d: any = data || {};
  const s: any = d.settings || {};
  return {
    can_edit: !!d.can_edit,
    settings: {
      max_installments: Number(s.max_installments ?? 12),
      max_interest_free: Number(s.max_interest_free ?? 1),
      min_installment_value: Number(s.min_installment_value ?? 0),
      pix_key_type: s.pix_key_type ?? null,
      pix_key: s.pix_key ?? null,
      pix_receiver_name: s.pix_receiver_name ?? null,
      pix_city: s.pix_city ?? null,
    },
    methods: ((d.methods || []) as any[]).map((m) => ({
      method: m.method, enabled: !!m.enabled, scope: m.scope, discount_pct: Number(m.discount_pct || 0), receive_days: Number(m.receive_days || 0),
    })),
    fees: ((d.fees || []) as any[]).map((f) => ({ method: f.method, installments: Number(f.installments), fee_pct: Number(f.fee_pct) })),
    gateways: ((d.gateways || []) as any[]).map((g) => ({ provider: g.provider, enabled: !!g.enabled, mode: g.mode, has_secret: !!g.has_secret })),
    platform_map: ((d.platform_map || []) as any[]).map((p) => ({ platform: 'yampi', platform_method: p.platform_method, method: p.method })),
  };
}

export async function saveFinConfig(storeId: string, payload: FinPayload): Promise<void> {
  const { error } = await sb.rpc('gestor_fin_save', { p_store: storeId, p_data: payload });
  if (error) throw new Error(error.message);
}

async function callGateway(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('gestor-fin-gateway', { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context.json(); if (j?.error) msg = String(j.error); } catch { /* mantem */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data;
}

/** Testa a chave no gateway e guarda no Vault. Devolve o modo detectado. */
export async function saveGatewayKey(storeId: string, provider: string, secret: string): Promise<'test' | 'live'> {
  const d = await callGateway({ action: 'save_key', store_id: storeId, provider, secret });
  return d.mode as 'test' | 'live';
}

export async function clearGatewayKey(storeId: string, provider: string): Promise<void> {
  await callGateway({ action: 'clear_key', store_id: storeId, provider });
}