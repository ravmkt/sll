import { supabase } from '@/lib/supabase';
import type { Trigger } from '@/lib/tipsMetrics';

const sb: any = supabase;

export interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  niche: string[];
  metric_trigger: Trigger | null;
  action_label: string | null;
  action_url: string | null;
  estimated_minutes: number | null;
  is_featured: boolean;
  status: boolean;
  created_at: string;
}

export type TipInput = Omit<Tip, 'id' | 'created_at'>;

export interface TipFeedback { tip_id: string; implemented: boolean; vote: number | null }

export async function listActiveTips(): Promise<Tip[]> {
  const { data, error } = await sb.from('tips').select('*').eq('status', true)
    .order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Tip[];
}

export async function listAllTips(): Promise<Tip[]> {
  const { data, error } = await sb.from('tips').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Tip[];
}

export async function saveTip(input: TipInput, id?: string): Promise<void> {
  const payload = { ...input, updated_at: new Date().toISOString() };
  const q = id ? sb.from('tips').update(payload).eq('id', id) : sb.from('tips').insert(payload);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function setTipStatus(id: string, status: boolean): Promise<void> {
  const { error } = await sb.from('tips').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTip(id: string): Promise<void> {
  const { error } = await sb.from('tips').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listFeedback(storeId: string): Promise<TipFeedback[]> {
  const { data, error } = await sb.from('tip_feedback').select('tip_id,implemented,vote').eq('store_id', storeId);
  if (error) return [];
  return (data || []) as TipFeedback[];
}

export async function saveFeedback(storeId: string, fb: TipFeedback): Promise<void> {
  const { error } = await sb.from('tip_feedback').upsert(
    { store_id: storeId, tip_id: fb.tip_id, implemented: fb.implemented, vote: fb.vote, updated_at: new Date().toISOString() },
    { onConflict: 'tip_id,store_id' },
  );
  if (error) throw new Error(error.message);
}