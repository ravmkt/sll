import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface NpsConfig {
  enabled: boolean;
  min_days_after_signup: number;
  cooldown_days: number;
  dismiss_days: number;
  target: 'all' | 'stores';
  store_ids: string[];
}

export interface NpsCount { key: string; count: number }
export interface NpsComment { store: string | null; score: number; comment: string | null; pain_other: string | null; created_at: string }
export interface NpsResults {
  total: number; promoters: number; passives: number; detractors: number; nps: number | null;
  distribution: { score: number; count: number }[];
  pains: NpsCount[]; features: NpsCount[]; comments: NpsComment[];
}

export async function getNpsConfig(): Promise<NpsConfig> {
  const { data, error } = await sb.rpc('admin_nps_get_config');
  if (error) throw error;
  return data as NpsConfig;
}

export async function saveNpsConfig(cfg: NpsConfig): Promise<void> {
  const { error } = await sb.rpc('admin_nps_save_config', { p: cfg });
  if (error) throw error;
}

export async function getNpsResults(days: number): Promise<NpsResults> {
  const { data, error } = await sb.rpc('admin_nps_results', { p_days: days });
  if (error) throw error;
  return data as NpsResults;
}

export async function resetNpsStore(storeId: string): Promise<number> {
  const { data, error } = await sb.rpc('admin_nps_reset_store', { p_store_id: storeId });
  if (error) throw error;
  return Number(data ?? 0);
}