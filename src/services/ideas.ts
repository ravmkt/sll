import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type IdeaStatus = 'received' | 'analysis' | 'planned' | 'in_progress' | 'done' | 'hidden';

export const IDEA_STATUS: Record<IdeaStatus, { label: string; cls: string }> = {
  received: { label: 'Recebida', cls: 'bg-slate-100 text-slate-600' },
  analysis: { label: 'Em análise', cls: 'bg-amber-100 text-amber-700' },
  planned: { label: 'Planejado', cls: 'bg-sky-100 text-sky-700' },
  in_progress: { label: 'Em desenvolvimento', cls: 'bg-violet-100 text-violet-700' },
  done: { label: 'Entregue', cls: 'bg-emerald-100 text-emerald-700' },
  hidden: { label: 'Oculta', cls: 'bg-rose-100 text-rose-700' },
};

export interface Idea {
  id: string;
  category: string;
  body: string;
  status: IdeaStatus;
  votes: number;
  voted: boolean;
  mine: boolean;
  created_at: string;
}

export async function listIdeas(storeId: string): Promise<Idea[]> {
  const { data, error } = await sb.rpc('ideas_list', { p_store_id: storeId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({ ...r, votes: Number(r.votes) || 0 })) as Idea[];
}

export async function toggleIdeaVote(ideaId: string, storeId: string): Promise<boolean> {
  const { data, error } = await sb.rpc('ideas_toggle_vote', { p_feedback_id: ideaId, p_store_id: storeId });
  if (error) throw error;
  return !!data;
}