import { supabase } from '@/lib/supabase';

export type MktKind = 'banner' | 'popup';
export type MktLocation = 'all' | 'home' | 'vidlytics' | 'live';
export type MktAudience = 'all' | 'past_due' | 'trial';
export type MktFrequency = 'once' | 'session' | 'daily' | 'always';

export interface MktSlide {
  image_url: string;
  starts_at: string | null;
  ends_at: string | null;
}

export interface MktDraft {
  slides?: MktSlide[];
  id?: string;
  kind: MktKind;
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  coupon_code: string;
  location: MktLocation;
  audience: MktAudience;
  frequency: MktFrequency;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface MktItem extends MktDraft {
  id: string;
  created_at: string;
  impressions: number;
  clicks: number;
  closes: number;
}

export interface MktCounts { impressions: number; clicks: number; closes: number }
export type MktMetrics = Record<MktKind, MktCounts>;

export const LOCATION_LABEL: Record<MktLocation, string> = {
  all: 'Todos os locais',
  home: 'Home do SLL',
  vidlytics: 'Vidlytics',
  live: 'Live Commerce',
};
export const AUDIENCE_LABEL: Record<MktAudience, string> = {
  all: 'Todos os lojistas',
  past_due: 'Inadimplentes',
  trial: 'Em período de teste',
};
export const FREQUENCY_LABEL: Record<MktFrequency, string> = {
  session: 'Uma vez por sessão',
  once: 'Uma só vez (por navegador)',
  daily: 'Uma vez por dia',
  always: 'Sempre que abrir',
};

export const emptyDraft = (kind: MktKind): MktDraft => ({
  kind, title: '', body: '', image_url: '', cta_label: '', cta_url: '', coupon_code: '',
  location: 'all', audience: 'all', frequency: 'always', starts_at: null, ends_at: null, is_active: true,
});

export async function listItems(kind?: MktKind): Promise<MktItem[]> {
  const { data, error } = await supabase.rpc('admin_marketing_list', { p_kind: kind ?? null });
  if (error) throw error;
  return (data || []) as MktItem[];
}

export async function saveItem(d: MktDraft): Promise<string> {
  const { id, ...rest } = d;
  const slides = (rest.slides ?? []).filter((s) => s.image_url);
  const hasSlides = d.kind === 'banner' && Array.isArray(d.slides);
  const payload = { ...rest, slides, image_url: hasSlides ? (slides[0]?.image_url ?? '') : rest.image_url };
  const { data, error } = await supabase.rpc('admin_marketing_save', { p_id: id ?? null, p_data: payload });
  if (error) throw error;
  return data as string;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_marketing_delete', { p_id: id });
  if (error) throw error;
}

const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function getMetrics(days: number): Promise<MktMetrics> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const { data, error } = await supabase.rpc('admin_marketing_metrics', { p_start: ymd(start), p_end: ymd(end) });
  if (error) throw error;
  const zero = { impressions: 0, clicks: 0, closes: 0 };
  const raw = (data || {}) as Partial<MktMetrics>;
  return { banner: { ...zero, ...raw.banner }, popup: { ...zero, ...raw.popup } };
}