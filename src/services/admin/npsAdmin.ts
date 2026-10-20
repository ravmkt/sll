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
  questions?: { title: string; total: number; items: NpsCount[] }[];
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

export async function getNpsResults(days: number, surveyId?: string | null): Promise<NpsResults> {
  const { data, error } = await sb.rpc('admin_nps_results', { p_days: days, p_survey_id: surveyId ?? null });
  if (error) throw error;
  return data as NpsResults;
}

export async function resetNpsStore(storeId: string): Promise<number> {
  const { data, error } = await sb.rpc('admin_nps_reset_store', { p_store_id: storeId });
  if (error) throw error;
  return Number(data ?? 0);
}

export interface NpsOptionRow {
  kind: 'pain' | 'feature';
  key: string;
  label: string;
  sort_order: number;
  active: boolean;
  isNew?: boolean;
}

export async function listNpsOptions(): Promise<NpsOptionRow[]> {
  const { data, error } = await sb.rpc('admin_nps_list_options');
  if (error) throw error;
  return (data ?? []) as NpsOptionRow[];
}

export async function saveNpsOptions(rows: NpsOptionRow[]): Promise<void> {
  const payload = rows.map(({ kind, key, label, sort_order, active }) => ({ kind, key, label, sort_order, active }));
  const { error } = await sb.rpc('admin_nps_save_options', { p: payload });
  if (error) throw error;
}

export interface NpsStoreRow { id: string; name: string | null }

export async function listNpsStores(): Promise<NpsStoreRow[]> {
  const { data, error } = await sb.rpc('admin_nps_list_stores');
  if (error) throw error;
  return (data ?? []) as NpsStoreRow[];
}

export async function saveNpsTexts(p: Record<string, string>): Promise<void> {
  const { error } = await sb.rpc('admin_nps_save_texts', { p });
  if (error) throw error;
}

export interface NpsResponse {
  id: string; created_at: string; score: number; comment: string | null;
  payload: Record<string, unknown> | null;
  store_id: string; store_name: string | null; contact_name: string | null;
  email: string | null; whatsapp: string | null; user_email: string | null; survey_name?: string | null;
}

export async function listNpsResponses(days: number, surveyId?: string | null): Promise<NpsResponse[]> {
  const { data, error } = await sb.rpc('admin_nps_responses', { p_days: days, p_survey_id: surveyId ?? null });
  if (error) throw error;
  return (data ?? []) as NpsResponse[];
}