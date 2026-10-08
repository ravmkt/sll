import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type Limits = Record<string, unknown>;
export type Prices = { m: number; s: number; a: number };

export const NUM_KEYS = [
  'usd_to_brl_rate', 'storage_cost_usd_per_gb', 'traffic_cost_usd_per_gb', 'supabase_pro_usd', 'vercel_pro_usd',
  'domain_and_tools_monthly_brl', 'gateway_fee_percent', 'tax_percent', 'min_tenants_divider', 'mb_per_play',
  'realistic_usage_percent',
] as const;
export type NumKey = (typeof NUM_KEYS)[number];

export type CostSettings = Record<NumKey, number> & {
  id: number;
  last_currency_sync_at: string | null;
  auto_sync_currency: boolean;
};

export async function getCostSettings(): Promise<CostSettings | null> {
  const { data, error } = await sb.from('infrastructure_cost_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const out: any = { ...data };
  NUM_KEYS.forEach((k) => { out[k] = Number(data[k]); });
  return out as CostSettings;
}

export async function saveCostSettings(patch: Partial<Record<NumKey, number>> & { auto_sync_currency?: boolean }): Promise<void> {
  const { error } = await sb
    .from('infrastructure_cost_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

export async function getPayingStores(): Promise<number> {
  const { data, error } = await sb.rpc('admin_paying_stores_count');
  if (error) throw new Error(error.message);
  return Number(data) || 0;
}

export async function fetchUsdBrl(): Promise<number> {
  const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
  if (!r.ok) throw new Error('Falha ao consultar o câmbio.');
  const j = await r.json();
  const bid = Number(j?.USDBRL?.bid);
  if (!Number.isFinite(bid) || bid <= 0) throw new Error('Cotação inválida recebida.');
  return bid;
}

const today = () => new Date().toLocaleDateString('en-CA');

export async function syncFx(): Promise<CostSettings> {
  const rate = await fetchUsdBrl();
  const now = new Date().toISOString();
  const { error } = await sb
    .from('infrastructure_cost_settings')
    .update({ usd_to_brl_rate: rate, last_currency_sync_at: now, updated_at: now })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  await sb.from('fx_rate_history').upsert({ day: today(), rate }, { onConflict: 'day' });
  const s = await getCostSettings();
  if (!s) throw new Error('Configuração de custos não encontrada.');
  return s;
}

// Alerta se o dolar atual estiver 8% acima da media dos ultimos 30 dias (precisa de 5+ dias de historico)
export async function getFxAlert(current: number): Promise<{ rate: number; avg: number } | null> {
  const since = new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA');
  const { data } = await sb.from('fx_rate_history').select('rate').gte('day', since).lt('day', today());
  const rates = ((data as any[]) || []).map((r) => Number(r.rate)).filter((n) => Number.isFinite(n));
  if (rates.length < 5) return null;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  return current > avg * 1.08 ? { rate: current, avg } : null;
}

export async function getDiscounts(): Promise<Record<string, number>> {
  const { data, error } = await sb.from('dynamic_plans').select('id,discount_pct');
  if (error) return {};
  return Object.fromEntries(((data as any[]) || []).map((r) => [r.id, Number(r.discount_pct) || 0]));
}

export async function getOverrides(): Promise<Record<string, Record<string, Limits>>> {
  const { data, error } = await sb.from('combo_modules').select('plan_id,module_slug,limits_override');
  if (error) return {};
  const out: Record<string, Record<string, Limits>> = {};
  ((data as any[]) || []).forEach((r) => {
    (out[r.plan_id] ??= {})[r.module_slug] = (r.limits_override || {}) as Limits;
  });
  return out;
}

// ---------- calculo de margem ----------
export type Calc = {
  storageBrl: number; trafficBrl: number; fixedTotal: number; fixedPerStore: number;
  deduction: number; mbPerPlay: number; realistic: number; payingStores: number;
};

export function buildCalc(s: CostSettings, paying: number): Calc {
  const rate = s.usd_to_brl_rate;
  const fixedTotal = (s.supabase_pro_usd + s.vercel_pro_usd) * rate + s.domain_and_tools_monthly_brl;
  return {
    storageBrl: s.storage_cost_usd_per_gb * rate,
    trafficBrl: s.traffic_cost_usd_per_gb * rate,
    fixedTotal,
    fixedPerStore: fixedTotal / Math.max(paying, s.min_tenants_divider, 1),
    deduction: (s.gateway_fee_percent + s.tax_percent) / 100,
    mbPerPlay: s.mb_per_play,
    realistic: s.realistic_usage_percent / 100,
    payingStores: paying,
  };
}

export type Level = 'ok' | 'warn' | 'low' | 'loss' | 'na';
export type Margin = {
  level: Level; worst: number | null; real: number | null;
  costWorst: number | null; costReal: number | null; reason?: string;
};
export const MARGIN_NA: Margin = { level: 'na', worst: null, real: null, costWorst: null, costReal: null };

// Custo variavel a "usage" (0..1) do limite. null = limite ilimitado (custo sem teto)
function variableCost(lim: Limits, c: Calc, usage: number): number | null {
  let t = 0;
  if ('storage_gb' in lim) {
    if (lim.storage_gb === null || lim.storage_gb === undefined) return null;
    t += Number(lim.storage_gb) * usage * c.storageBrl;
  }
  if ('views' in lim) {
    if (lim.views === null || lim.views === undefined) return null;
    t += ((Number(lim.views) * usage * c.mbPerPlay) / 1024) * c.trafficBrl;
  }
  return t;
}

// prices em centavos (total do periodo); semestral e anual viram valor mensal equivalente
export function computeMargin(prices: Prices, limitsList: Limits[], c: Calc): Margin {
  const rev = [prices.m, prices.s / 6, prices.a / 12].map((x) => x / 100).filter((x) => x > 0);
  if (!rev.length || !limitsList.length) return MARGIN_NA;

  const cost = (u: number): number | null => {
    let t = c.fixedPerStore;
    for (const l of limitsList) {
      const v = variableCost(l, c, u);
      if (v === null) return null;
      t += v;
    }
    return t;
  };
  const cw = cost(1);
  const cr = cost(c.realistic);
  if (cw === null || cr === null) return { ...MARGIN_NA, reason: 'Há limite ilimitado: o custo não tem teto.' };

  const mg = (cst: number) => Math.min(...rev.map((r) => (r - cst - r * c.deduction) / r));
  const worst = mg(cw);
  const real = mg(cr);
  const level: Level = worst >= 0.5 ? 'ok' : worst >= 0.2 ? 'warn' : worst >= 0 ? 'low' : 'loss';
  return { level, worst, real, costWorst: cw, costReal: cr };
}