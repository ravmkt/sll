import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { BuilderPage, PageContent } from '../types';

const db = () => (supabase as unknown as SupabaseClient).schema('builder');

export async function getCurrentStoreId(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Sessão inválida');

  const member = await supabase.from('sll_store_members').select('store_id').eq('user_id', uid).limit(1).maybeSingle();
  if (member.data?.store_id) return member.data.store_id as string;

  const owned = await supabase.from('stores').select('id').eq('owner_user_id', uid).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id as string;

  throw new Error('Nenhuma loja vinculada ao usuário');
}

export async function listPages(): Promise<BuilderPage[]> {
  const { data, error } = await db().from('pages').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data as BuilderPage[];
}

export async function getPage(id: string): Promise<BuilderPage> {
  const { data, error } = await db().from('pages').select('*').eq('id', id).single();
  if (error) throw error;
  return data as BuilderPage;
}

export async function createPage(title: string, type: 'landing' | 'product'): Promise<BuilderPage> {
  const storeId = await getCurrentStoreId();
  const base = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = `${base || 'pagina'}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await db()
    .from('pages')
    .insert({ store_id: storeId, type, title, slug, content: { blocks: [] } })
    .select()
    .single();
  if (error) throw error;
  return data as BuilderPage;
}

export async function savePage(id: string, title: string, content: PageContent): Promise<void> {
  const { error } = await db()
    .from('pages')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
