import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getPage, savePage, withSettings } from './pages';
import { renderPageHtml } from '../publish/renderHtml';
import { refreshShowcases } from './showcase';
import type { PageContent } from '../types';

const BUCKET = 'builder-pages';
const db = () => (supabase as unknown as SupabaseClient).schema('builder');
const cfg = () => ({
  apiUrl: import.meta.env.VITE_SUPABASE_URL as string,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
});

export async function buildPreviewHtml(id: string, title: string, content: PageContent): Promise<string> {
  const page = await getPage(id);
  return renderPageHtml({ id: page.id, title, content: await withSettings(id, content) }, { ...cfg(), preview: true });
}

async function resolvePublicUrls(storeId: string, pageSlug: string) {
  let storeRef = storeId;
  let customUrl: string | null = null;
  try {
    const s = await supabase.from('stores').select('slug').eq('id', storeId).maybeSingle();
    if (s.data?.slug) storeRef = s.data.slug as string;
    const d = await supabase
      .from('store_domains')
      .select('domain')
      .eq('store_id', storeId)
      .eq('status', 'verified')
      .limit(1)
      .maybeSingle();
    if (d.data?.domain) customUrl = `https://${d.data.domain}/${pageSlug}`;
  } catch {
    /* mantém o fallback por UUID */
  }
  return { url: `${window.location.origin}/p/${storeRef}/${pageSlug}`, customUrl };
}

export async function getPublishedUrl(id: string): Promise<string> {
  const page = await getPage(id);
  if (page.status !== 'published' || !page.published_html_path) return '';
  const r = await resolvePublicUrls(page.store_id, page.slug);
  return r.customUrl ?? r.url;
}

export async function publishPage(id: string, title: string, content: PageContent) {
  await savePage(id, title, content);
  const page = await getPage(id);
  const html = renderPageHtml({ ...page, content: { ...(await refreshShowcases(page.content)), settings: page.content.settings } }, cfg());
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

  const { url, customUrl } = await resolvePublicUrls(page.store_id, page.slug);
  return { url: customUrl ?? url, customUrl, longUrl: url, version };
}

