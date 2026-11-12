import { supabase } from '@/lib/supabase';

export type PageStat = { id: string; title: string; slug: string; type: 'landing' | 'product'; status: 'draft' | 'published'; views: number; leads: number };

export type BuilderOverview = {
  published: number; drafts: number;
  views: number; views_prev: number; views_month: number;
  leads: number; leads_prev: number; leads_month: number;
  pages: PageStat[];
};

export async function getBuilderOverview(storeId: string, days: number): Promise<BuilderOverview> {
  const { data, error } = await (supabase as any).rpc('builder_overview', { p_store: storeId, p_days: days });
  if (error) throw error;
  return data as BuilderOverview;
}