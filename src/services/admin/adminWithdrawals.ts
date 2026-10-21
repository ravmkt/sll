import { supabase } from '@/lib/supabase';

export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type WithdrawalAction = 'approve' | 'pay' | 'reject';

export type WithdrawalRow = {
  id: string;
  store_id: string;
  store_name: string | null;
  owner_email: string | null;
  amount: number;
  pix_key: string;
  pix_key_type: string;
  status: WithdrawalStatus;
  proof_url: string | null;
  admin_notes: string | null;
  requested_at: string;
  processed_at: string | null;
};

export type WithdrawalSummary = {
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  paid_amount: number;
};

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  paid: 'Pago',
  rejected: 'Rejeitado',
};

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const adminListWithdrawals = (status: string | null, limit = 100, offset = 0) =>
  call<{ total: number; rows: WithdrawalRow[]; summary: WithdrawalSummary }>('admin_list_withdrawals', {
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });

export const adminProcessWithdrawal = (id: string, action: WithdrawalAction, notes?: string, proofUrl?: string) =>
  call<{ id: string; status: WithdrawalStatus }>('admin_process_withdrawal', {
    p_id: id,
    p_action: action,
    p_notes: notes || null,
    p_proof_url: proofUrl || null,
  });

export type AffiliateSettings = {
  grace_days: number;
  payout_day: number;
  min_withdrawal: number;
  auto_approve_max: number;
};

export const adminGetAffiliateSettings = () => call<AffiliateSettings>('admin_get_affiliate_settings', {});

export const adminSetAffiliateSettings = (s: AffiliateSettings) =>
  call<AffiliateSettings>('admin_set_affiliate_settings', {
    p_grace: s.grace_days,
    p_payout_day: s.payout_day,
    p_min: s.min_withdrawal,
    p_auto_max: s.auto_approve_max,
  });

const PROOF_BUCKET = 'withdrawal-proofs';

export async function uploadWithdrawalProof(row: { id: string; store_id: string }, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${row.store_id}/${row.id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function getWithdrawalProofUrl(ref: string): Promise<string> {
  if (/^https?:\/\//i.test(ref)) return ref;
  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(ref, 300);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Comprovante indisponível');
  return data.signedUrl;
}