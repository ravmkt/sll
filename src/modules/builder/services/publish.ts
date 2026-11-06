import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getPage, savePage } from './pages';
import { renderPageHtml } from '../publish/renderHtml';
import type { PageContent } from '../types';

const BUCKET = 'builder-pages';
const db = () => (supabase as unknown as SupabaseClient).schema('builder');
const cfg = () => ({
  apiUrl: import.meta.env.VITE_SUPABASE_URL as string,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
});

export async function buildPreviewHtml(id: string, title: string, content: PageContent): Promise<string> {
  const page = await getPage(id);
  return renderPageHtml({ id: page.id, title, content }, cfg());
}

export async function publishPage(id: string, title: string, content: PageContent) {
  await savePage(id, title, content);
  const page = await getPage(id);
  const html = renderPageHtml(page, cfg());
  const path = `${page.store_id}/${page.slug}/index.html`;

  const up = await supabase.storage.from(BUCKET).upload(path, new Blob([html], { type: 'text/html; charset=utf-8' }), {
    upsert: true,
    contentType: 'text/html; charset=utf-8',
    cacheControl: '60',
  });
  if (up.error) throw up.error;

  const version = (page.published_version ?? 0) + 1;
  const v = await db().from('page_versions').insert({ page_id: id, version, content });
  if (v.error) throw v.error;

  const upd = await db()
    .from('pages')
    .update({ status: 'published', published_html_path: path, published_version: version, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (upd.error) throw upd.error;

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { url, version };
}
