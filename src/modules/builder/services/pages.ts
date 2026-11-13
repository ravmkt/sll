import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { BuilderPage, PageContent } from '../types';
import { useBuilder } from '../store';

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
  const slug = await uniqueSlug(storeId, base || 'pagina');
  const { data, error } = await db()
    .from('pages')
    .insert({ store_id: storeId, type, title, slug, content: { blocks: [] } })
    .select()
    .single();
  if (error) throw error;
  return data as BuilderPage;
}

export async function withSettings(id: string, content: PageContent): Promise<PageContent> {
  const c = await withSettingsBase(id, content);
  let sid = '';
  try { sid = String((await getCurrentStoreId()) ?? ''); } catch { /* sem loja */ }
  return sid ? { ...c, settings: { ...(c.settings ?? {}), sllStoreId: sid } } : c;
}

async function withSettingsBase(id: string, content: PageContent): Promise<PageContent> {
  if (content.settings) return content;
  const st = useBuilder.getState();
  if (st.pageId === id) return { ...content, settings: st.settings };
  const cur = await db().from('pages').select('content').eq('id', id).maybeSingle();
  const prev = (cur.data?.content as PageContent | undefined)?.settings;
  return prev ? { ...content, settings: prev } : content;
}

export async function savePage(id: string, title: string, content: PageContent): Promise<void> {
  content = await withSettings(id, content);
  const { error } = await db()
    .from('pages')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

const RESERVED_SLUGS = new Set(['api', 'assets', 'p', 'admin', 'login', 'index', 'sll-loader']);

async function uniqueSlug(storeId: string, base: string): Promise<string> {
  const { data, error } = await db().from('pages').select('slug').eq('store_id', storeId).like('slug', `${base}%`);
  if (error) throw error;
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  const isTaken = (s: string) => taken.has(s) || RESERVED_SLUGS.has(s);
  if (!isTaken(base)) return base;
  let n = 2;
  while (isTaken(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function deletePage(id: string): Promise<void> {
  const page = await getPage(id);
  if (page.published_html_path) {
    const rm = await supabase.storage.from('builder-pages').remove([page.published_html_path]);
    if (rm.error) throw rm.error;
  }
  const v = await db().from('page_versions').delete().eq('page_id', id);
  if (v.error) throw v.error;
  const { error } = await db().from('pages').delete().eq('id', id);
  if (error) throw error;
}

export async function createPageFromContent(title: string, type: 'landing' | 'product', content: PageContent): Promise<BuilderPage> {
  const page = await createPage(title, type);
  await savePage(page.id, title, content);
  return { ...page, content };
}
