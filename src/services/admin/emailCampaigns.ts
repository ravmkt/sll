import { supabase } from '@/lib/supabase';
import type { MktAudience } from '@/services/admin/marketingAdmin';

export interface EmailCampaign {
  id: string;
  subject: string;
  message: string;
  audience: MktAudience;
  store_id: string | null;
  status: 'sending' | 'sent' | 'partial' | 'failed';
  total: number;
  sent: number;
  failed: number;
  created_at: string;
  finished_at: string | null;
}

export interface SendResult { ok: boolean; to?: string; total?: number; sent?: number; failed?: number }

export async function listCampaigns(): Promise<EmailCampaign[]> {
  const { data, error } = await supabase.rpc('admin_email_campaigns_list');
  if (error) throw error;
  return (data || []) as EmailCampaign[];
}

export async function countRecipients(audience: MktAudience, storeId: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('admin_email_recipient_count', { p_audience: audience, p_store_id: audience === 'store' ? storeId : null });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function sendCampaign(p: { subject: string; message: string; audience: MktAudience; storeId: string | null; test: boolean }): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke('send-campaign-email', {
    body: { subject: p.subject, message: p.message, audience: p.audience, store_id: p.audience === 'store' ? p.storeId : null, test: p.test },
  });
  if (error) {
    let msg = error.message;
    try {
      const j = await (error as any).context?.json?.();
      if (j?.error) msg = j.error;
    } catch { /* ignora */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as SendResult;
}

const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function getEmailMetrics(days: number): Promise<{ sent: number; failed: number }> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const { data, error } = await supabase.rpc('admin_email_metrics', { p_start: ymd(start), p_end: ymd(end) });
  if (error) throw error;
  return { sent: Number((data as any)?.sent ?? 0), failed: Number((data as any)?.failed ?? 0) };
}