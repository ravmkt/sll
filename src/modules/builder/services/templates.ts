import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { PageContent } from '../types';

export type BuilderTemplate = {
  id: string; name: string; category: string | null; type: 'landing' | 'product';
  content: PageContent; is_global: boolean; created_at: string;
};

export async function listTemplates(): Promise<BuilderTemplate[]> {
  const { data, error } = await (supabase as unknown as SupabaseClient).schema('builder').from('templates').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BuilderTemplate[];
}