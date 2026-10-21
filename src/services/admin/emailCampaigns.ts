import type { DateRange } from '@/services/admin/marketingPeriod';
import { supabase } from '@/lib/supabase';
import type { MktAudience } from '@/services/admin/marketingAdmin';
import type { EmailBlock } from '@/services/admin/emailBuilder';

export interface EmailCampaign {
  id: string;
  subject: string;
  message: string;
  html?: string | null;
  blocks?: EmailBlock[] | null;
  has_blocks?: boolean;
  audience: MktAudience;
  store_id: string | null;
  status: 'sending' | 'sent' | 'partial' | 'failed';
  total: number;
  sent: number;
  failed: number;
  created_at: string;
  finished_at: string | null;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}

export interface EmailSendRow {
  email: string;
  status: 'sent' | 'failed';
  error: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  open_count: number;
  click_count: number;
}

export interface EmailMetrics {
  sent: number; failed: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number;
}
export const EMPTY_EMAIL_METRICS: EmailMetrics = { sent: 0, failed: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 };

export interface SendResult { ok: boolean; to?: string; total?: number; sent?: number; failed?: number }

const n = (v: unknown) => Number(v ?? 0) || 0;
const norm = (c: any): EmailCampaign => ({
  ...c,
  total: n(c.total), sent: n(c.sent), failed: n(c.failed),
  delivered: n(c.delivered), opened: n(c.opened), clicked: n(c.clicked), bounced: n(c.bounced), complained: n(c.complained),
});

export async function listCampaigns(): Promise<EmailCampaign[]> {
  const { data, error } = await supabase.rpc('admin_email_campaigns_list');
  if (error) throw error;
  return ((data || []) as any[]).map(norm);
}

export async function getCampaignDetail(id: string): Promise<{ campaign: EmailCampaign; sends: EmailSendRow[] }> {
  const { data, error } = await supabase.rpc('admin_email_campaign_detail', { p_id: id });
  if (error) throw error;
  const d = data as any;
  return {
    campaign: norm(d.campaign),
    sends: ((d.sends || []) as any[]).map((s) => ({ ...s, open_count: n(s.open_count), click_count: n(s.click_count) })),
  };
}

export async function countRecipients(audience: MktAudience, storeId: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('admin_email_recipient_count', { p_audience: audience, p_store_id: audience === 'store' ? storeId : null });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function sendCampaign(p: { subject: string; html: string; text: string; audience: MktAudience; storeId: string | null; test: boolean; blocks?: EmailBlock[] }): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke('send-campaign-email', {
    body: { subject: p.subject, html: p.html, text: p.text, audience: p.audience, store_id: p.audience === 'store' ? p.storeId : null, test: p.test, blocks: p.blocks },
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

export interface EmailDraft {
  id: string; kind: 'draft' | 'template'; name: string; subject: string;
  blocks: EmailBlock[]; audience: MktAudience; store_id: string | null; updated_at: string;
}
export interface EmailInitial { subject: string; blocks: EmailBlock[]; audience: MktAudience; storeId: string | null }

export async function listDrafts(): Promise<EmailDraft[]> {
  const { data, error } = await supabase.rpc('admin_email_drafts_list');
  if (error) throw error;
  return (data || []) as EmailDraft[];
}

export async function saveDraft(p: {
  id?: string | null; kind: 'draft' | 'template'; name: string; subject: string;
  blocks: EmailBlock[]; audience: MktAudience; storeId: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('admin_email_draft_save', {
    p_id: p.id ?? null, p_kind: p.kind, p_name: p.name, p_subject: p.subject, p_blocks: p.blocks,
    p_audience: p.audience, p_store_id: p.audience === 'store' ? p.storeId : null,
  });
  if (error) throw error;
  return String(data);
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_email_draft_delete', { p_id: id });
  if (error) throw error;
}

export async function uploadEmailImage(file: File): Promise<string> {
  if (file.size > 3 * 1024 * 1024) throw new Error('Imagem acima de 3 MB.');
  if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) throw new Error('Use PNG, JPG, GIF ou WEBP.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('email-assets').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw error;
  return supabase.storage.from('email-assets').getPublicUrl(path).data.publicUrl;
}

const ymd = (d: Date) => {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function getEmailMetrics(arg: number | DateRange): Promise<EmailMetrics> {
  const days = typeof arg === 'number' ? arg : 1;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const { data, error } = await supabase.rpc('admin_email_metrics', typeof arg === 'number' ? { p_start: ymd(start), p_end: ymd(end) } : { p_start: arg.start, p_end: arg.end });
  if (error) throw error;
  const d = (data || {}) as Record<string, unknown>;
  return {
    sent: n(d.sent), failed: n(d.failed), delivered: n(d.delivered), opened: n(d.opened),
    clicked: n(d.clicked), bounced: n(d.bounced), complained: n(d.complained),
  };
}