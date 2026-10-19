import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type ReqStatus = 'received' | 'review' | 'planned' | 'dev' | 'done';

export const STATUS_ORDER: ReqStatus[] = ['received', 'review', 'planned', 'dev', 'done'];
export const STATUS_LABEL: Record<ReqStatus, string> = {
  received: 'Recebida',
  review: 'Em análise',
  planned: 'Planejado',
  dev: 'Em desenvolvimento',
  done: 'Entregue',
};
export const STATUS_CLS: Record<ReqStatus, string> = {
  received: 'bg-slate-100 text-slate-600',
  review: 'bg-amber-50 text-amber-700',
  planned: 'bg-sky-50 text-[#0094eb]',
  dev: 'bg-violet-50 text-violet-700',
  done: 'bg-emerald-50 text-emerald-700',
};
export const MODULES = ['Geral', 'Vidlytics', 'Stream Sell', 'Gamificação', 'PDV', 'Outro'];

export type BoardRow = {
  id: string; title: string; category: string; module: string; status: ReqStatus;
  votes: number; voted: boolean; created_at: string;
};
export type AdminRow = {
  id: string; title: string; category: string; module: string; status: ReqStatus;
  hidden: boolean; votes: number; store_name: string | null; created_at: string;
};

export async function boardList(storeId: string): Promise<BoardRow[]> {
  const { data, error } = await sb.rpc('fr_board', { p_store_id: storeId });
  if (error) throw new Error(error.message);
  return ((data as any[]) || []).map((r) => ({ ...r, votes: Number(r.votes) }));
}

export async function toggleVote(id: string, storeId: string): Promise<boolean> {
  const { data, error } = await sb.rpc('fr_toggle_vote', { p_request_id: id, p_store_id: storeId });
  if (error) throw new Error(error.message);
  return !!data;
}

export async function adminList(): Promise<AdminRow[]> {
  const { data, error } = await sb.rpc('admin_fr_list');
  if (error) throw new Error(error.message);
  return ((data as any[]) || []).map((r) => ({ ...r, votes: Number(r.votes) }));
}

export async function updateRequest(id: string, patch: Partial<Pick<AdminRow, 'title' | 'module' | 'status' | 'hidden'>>): Promise<void> {
  const { error } = await sb.from('feature_requests').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export function sortBy<T>(rows: T[], get: (r: T) => string | number, dir: 'asc' | 'desc'): T[] {
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
    return dir === 'asc' ? r : -r;
  });
}