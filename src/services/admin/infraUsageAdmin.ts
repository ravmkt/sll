import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type Quota = {
  key: string; service: string; label: string; unit: string;
  included: number; overage_usd: number; source: 'auto' | 'manual'; sort: number;
};

export async function getQuotas(): Promise<Quota[]> {
  const { data, error } = await sb.from('infra_quotas').select('*').order('sort');
  if (error) throw new Error(error.message);
  return ((data as any[]) || []).map((r) => ({ ...r, included: Number(r.included), overage_usd: Number(r.overage_usd) })) as Quota[];
}

export async function saveQuotaIncluded(items: { key: string; included: number }[]): Promise<void> {
  for (const it of items) {
    const { error } = await sb.from('infra_quotas').update({ included: it.included }).eq('key', it.key);
    if (error) throw new Error(error.message);
  }
}

export async function getManualUsage(): Promise<Record<string, number>> {
  const { data, error } = await sb.from('infra_usage').select('key,value');
  if (error) return {};
  return Object.fromEntries(((data as any[]) || []).map((r) => [r.key, Number(r.value) || 0]));
}

export async function saveManualUsage(map: Record<string, number>): Promise<void> {
  const now = new Date().toISOString();
  const rows = Object.entries(map).map(([key, value]) => ({ key, value, updated_at: now }));
  if (!rows.length) return;
  const { error } = await sb.from('infra_usage').upsert(rows, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}

export async function getAutoUsage(): Promise<Record<string, number>> {
  const { data, error } = await sb.rpc('admin_supabase_usage');
  if (error || !data) return {};
  return Object.fromEntries(Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, Number(v) || 0]));
}