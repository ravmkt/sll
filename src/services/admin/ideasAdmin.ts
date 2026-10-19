import { supabase } from '@/lib/supabase';
import type { IdeaStatus } from '@/services/ideas';

const sb: any = supabase;

export interface AdminIdea {
  id: string;
  category: string;
  body: string;
  public_title: string | null;
  status: IdeaStatus;
  votes: number;
  store_name: string | null;
  created_at: string;
}

export async function listAdminIdeas(): Promise<AdminIdea[]> {
  const { data, error } = await sb.rpc('admin_ideas_list');
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({ ...r, votes: Number(r.votes) || 0 })) as AdminIdea[];
}

export async function setAdminIdea(id: string, status: IdeaStatus, title: string): Promise<void> {
  const { error } = await sb.rpc('admin_idea_set', { p_feedback_id: id, p_status: status, p_title: title });
  if (error) throw error;
}