import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type QType = 'nps' | 'single' | 'multi' | 'text';
export type AdminOption = { key: string; label: string };
export type AdminQuestion = {
  id?: string;
  type: QType;
  title: string;
  required: boolean;
  placeholder: string | null;
  allow_other: boolean;
  options: AdminOption[];
  legacy_key?: string | null;
};
export type AdminSurvey = {
  id?: string;
  name: string;
  enabled: boolean;
  invite_title: string;
  invite_text: string;
  min_days_after_signup: number;
  cooldown_days: number;
  dismiss_days: number;
  target: 'all' | 'stores';
  store_ids: string[];
  responses_count?: number;
  questions: AdminQuestion[];
};

export async function listNpsSurveys(): Promise<AdminSurvey[]> {
  const { data, error } = await sb.rpc('admin_nps_list_surveys');
  if (error) throw error;
  return (data ?? []) as AdminSurvey[];
}

export async function saveNpsSurvey(s: AdminSurvey): Promise<string> {
  const { data, error } = await sb.rpc('admin_nps_save_survey', { p: s });
  if (error) throw error;
  return data as string;
}

export async function deleteNpsSurvey(id: string): Promise<void> {
  const { error } = await sb.rpc('admin_nps_delete_survey', { p_id: id });
  if (error) throw error;
}

export async function listAdminStores(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await sb.from('stores').select('id,name').order('name').limit(1000);
  if (error) throw error;
  return (data ?? []) as { id: string; name: string }[];
}
export type NpsStat = { views: number; dismissals: number };

export async function listNpsStats(): Promise<Record<string, NpsStat>> {
  const { data, error } = await sb.rpc('admin_nps_survey_stats');
  if (error) throw error;
  const out: Record<string, NpsStat> = {};
  for (const r of (data ?? []) as any[]) out[r.survey_id] = { views: Number(r.views) || 0, dismissals: Number(r.dismissals) || 0 };
  return out;
}

export async function resetNpsStore(storeId: string): Promise<void> {
  const { error } = await sb.rpc('admin_nps_reset_store', { p_store_id: storeId });
  if (error) throw error;
}

export async function logNpsEvent(surveyId: string, storeId: string, event: 'view' | 'dismiss'): Promise<void> {
  await sb.rpc('nps_log_event', { p_survey_id: surveyId, p_store_id: storeId, p_event: event });
}