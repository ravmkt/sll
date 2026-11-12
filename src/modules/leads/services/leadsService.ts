import { supabase } from '@/lib/supabase';

export const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
export type LeadStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  converted: 'Convertido',
  lost: 'Perdido',
};

export interface Lead {
  id: string;
  store_id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string | null;
  source_ref: string | null;
  status: LeadStatus;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export async function listLeads(storeId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return ((data || []) as Partial<Lead>[]).map((l) => ({
    ...(l as Lead),
    status: (STATUSES as readonly string[]).includes(l.status as string) ? (l.status as LeadStatus) : 'new',
    tags: Array.isArray(l.tags) ? l.tags : [],
  }));
}

export async function updateLead(id: string, patch: Partial<Pick<Lead, 'status' | 'tags' | 'notes' | 'name' | 'email' | 'whatsapp'>>): Promise<void> {
  const { error } = await supabase.from('leads').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}
export interface Touchpoint {
  id: string;
  source: string | null;
  created_at: string;
}

export async function listTouchpoints(leadId: string): Promise<Touchpoint[]> {
  const { data, error } = await supabase
    .from('lead_touchpoints')
    .select('id, source, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Touchpoint[];
}