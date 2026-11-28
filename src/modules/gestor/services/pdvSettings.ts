import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadCache, saveCache } from './pdvOffline';
import { NET_EVENT, isContingency, withTimeout } from './pdvNet';

const sb: any = supabase;

export type CustomerField = 'name' | 'cpf' | 'whatsapp';
export interface ShippingOption { label: string; value: number }

export interface PdvRules {
  store_id: string;
  /** dono, admin ou superadmin: sem limites de desconto e frete */
  is_manager: boolean;
  default_warehouse_id: string | null;
  max_interest_free: number;
  receipt_width_mm: 58 | 80;
  customer_required: Record<CustomerField, boolean>;
  discount_enabled: boolean;
  discount_max_pct: number | null;
  discount_max_value: number | null;
  shipping_enabled: boolean;
  shipping_mode: 'options' | 'free';
  shipping_options: ShippingOption[];
  note_enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface PdvRulesPatch {
  customer_required?: Partial<Record<CustomerField, boolean>>;
  discount_enabled?: boolean;
  discount_max_pct?: number | null;
  discount_max_value?: number | null;
  shipping_enabled?: boolean;
  shipping_mode?: 'options' | 'free';
  shipping_options?: ShippingOption[];
  note_enabled?: boolean;
}

export type RulesSource = 'online' | 'cache' | 'default';
export interface RulesResult { rules: PdvRules; source: RulesSource; savedAt: number | null; error: string | null }

const RULES_TIMEOUT_MS = 6000;
const cacheKey = (storeId: string) => 'pdv-rules:' + storeId;
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));

/** Padrão restritivo: vale quando nunca houve sincronização neste aparelho. */
export function defaultRules(storeId: string): PdvRules {
  return {
    store_id: storeId,
    is_manager: false,
    default_warehouse_id: null,
    max_interest_free: 1,
    receipt_width_mm: 80,
    customer_required: { name: true, cpf: true, whatsapp: true },
    discount_enabled: false,
    discount_max_pct: null,
    discount_max_value: null,
    shipping_enabled: false,
    shipping_mode: 'options',
    shipping_options: [],
    note_enabled: true,
    updated_at: null,
    updated_by: null,
  };
}

function normalize(storeId: string, raw: any): PdvRules {
  const d = defaultRules(storeId);
  if (!raw || typeof raw !== 'object') return d;
  const cr = raw.customer_required ?? {};
  return {
    store_id: storeId,
    is_manager: !!raw.is_manager,
    default_warehouse_id: raw.default_warehouse_id ?? null,
    max_interest_free: Number(raw.max_interest_free ?? 1),
    receipt_width_mm: Number(raw.receipt_width_mm) === 58 ? 58 : 80,
    customer_required: {
      name: cr.name !== false,
      cpf: cr.cpf !== false,
      whatsapp: cr.whatsapp !== false,
    },
    discount_enabled: !!raw.discount_enabled,
    discount_max_pct: num(raw.discount_max_pct),
    discount_max_value: num(raw.discount_max_value),
    shipping_enabled: !!raw.shipping_enabled,
    shipping_mode: raw.shipping_mode === 'free' ? 'free' : 'options',
    shipping_options: (Array.isArray(raw.shipping_options) ? raw.shipping_options : [])
      .map((o: any) => ({ label: String(o?.label ?? ''), value: Number(o?.value ?? 0) }))
      .filter((o: ShippingOption) => o.label && Number.isFinite(o.value)),
    note_enabled: raw.note_enabled !== false,
    updated_at: raw.updated_at ?? null,
    updated_by: raw.updated_by ?? null,
  };
}

async function fromCache(storeId: string, error: string | null): Promise<RulesResult> {
  const c = await loadCache<PdvRules>(cacheKey(storeId));
  if (c) return { rules: normalize(storeId, c.value), source: 'cache', savedAt: c.savedAt, error };
  return { rules: defaultRules(storeId), source: 'default', savedAt: null, error };
}

/** Online: busca e guarda a cópia. Sem rede, em contingência ou com falha: usa a última cópia. Nunca lança erro. */
export async function getPdvRules(storeId: string): Promise<RulesResult> {
  if (!navigator.onLine || isContingency()) return fromCache(storeId, null);
  try {
    const call = Promise.resolve(sb.rpc('gestor_pdv_settings_get', { p_store: storeId }));
    const { data, error } = await withTimeout(call, RULES_TIMEOUT_MS) as { data: unknown; error: { message: string } | null };
    if (error) throw new Error(error.message);
    const rules = normalize(storeId, data);
    await saveCache(cacheKey(storeId), rules);
    return { rules, source: 'online', savedAt: null, error: null };
  } catch (e) {
    return fromCache(storeId, e instanceof Error ? e.message : String(e));
  }
}

/** Só o gestor grava (o servidor confere). Lança erro se falhar. */
export async function savePdvRules(storeId: string, patch: PdvRulesPatch): Promise<PdvRules> {
  const { data, error } = await sb.rpc('gestor_pdv_settings_save', { p_store: storeId, p_data: patch });
  if (error) throw new Error(error.message);
  const rules = normalize(storeId, data);
  await saveCache(cacheKey(storeId), rules);
  return rules;
}

/** Hook: carrega, e recarrega quando a conexão volta ou a fila sincroniza. */
export function usePdvRules(storeId: string | null | undefined) {
  const [state, setState] = useState<RulesResult & { loading: boolean }>(() => ({
    rules: defaultRules(storeId ?? ''), source: 'default', savedAt: null, error: null, loading: !!storeId,
  }));

  const reload = useCallback(async (): Promise<void> => {
    if (!storeId) return;
    const r = await getPdvRules(storeId);
    setState({ ...r, loading: false });
  }, [storeId]);

  useEffect(() => {
    let alive = true;
    const run = () => { if (alive) void reload(); };
    run();
    window.addEventListener('online', run);
    window.addEventListener('sll-pdv-synced', run);
    window.addEventListener(NET_EVENT, run);
    return () => {
      alive = false;
      window.removeEventListener('online', run);
      window.removeEventListener('sll-pdv-synced', run);
      window.removeEventListener(NET_EVENT, run);
    };
  }, [reload]);

  return { ...state, reload };
}

// ---------- regras prontas para a tela (espelham a validação do servidor) ----------

/** Maior desconto permitido em R$. Infinity = sem limite (gestor). Vale o mais restritivo entre % e R$. */
export function maxDiscount(r: PdvRules, subtotal: number): number {
  if (r.is_manager) return Infinity;
  if (!r.discount_enabled) return 0;
  const lims: number[] = [];
  if (r.discount_max_pct !== null) lims.push(r2((subtotal * r.discount_max_pct) / 100));
  if (r.discount_max_value !== null) lims.push(r.discount_max_value);
  return lims.length ? Math.min(...lims) : subtotal;
}

export const canDiscount = (r: PdvRules): boolean => r.is_manager || r.discount_enabled;
export const canShipping = (r: PdvRules): boolean => r.is_manager || r.shipping_enabled;
/** valor livre: gestor, ou frete liberado no modo livre */
export const freeShipping = (r: PdvRules): boolean => r.is_manager || (r.shipping_enabled && r.shipping_mode === 'free');
export const canNote = (r: PdvRules): boolean => r.is_manager || r.note_enabled;

const digits = (s: string | null | undefined) => String(s ?? '').replace(/\D/g, '');

/** Campos do cliente que faltam, segundo a configuração do gestor. */
export function missingCustomerFields(
  r: PdvRules, c: { name?: string | null; document?: string | null; phone?: string | null },
): CustomerField[] {
  const miss: CustomerField[] = [];
  if (r.customer_required.name && !String(c.name ?? '').trim()) miss.push('name');
  if (r.customer_required.cpf && digits(c.document).length !== 11) miss.push('cpf');
  const w = digits(c.phone).length;
  if (r.customer_required.whatsapp && (w < 10 || w > 13)) miss.push('whatsapp');
  return miss;
}

export const CUSTOMER_FIELD_LABEL: Record<CustomerField, string> = { name: 'Nome', cpf: 'CPF', whatsapp: 'WhatsApp' };