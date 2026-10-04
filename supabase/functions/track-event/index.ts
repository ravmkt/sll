import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED = new Set([
  'video_view', 'story_open', 'story_complete', 'video_close', 'next_video', 'progress',
  'product_view', 'product_click', 'whatsapp_click', 'share', 'comment', 'like', 'unlike',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const storeCache = new Map<string, number>();

async function storeExists(id: string): Promise<boolean> {
  const hit = storeCache.get(id);
  if (hit && Date.now() - hit < 300000) return true;
  const { data } = await admin.from('stores').select('id').eq('id', id).maybeSingle();
  if (data) storeCache.set(id, Date.now());
  return !!data;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function uuidOrNull(v: unknown): string | null {
  return typeof v === 'string' && UUID.test(v) ? v : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const storeId = uuidOrNull(b?.storeId);
  const eventType = String(b?.eventType || '').trim();
  if (!storeId) return json({ error: 'invalid_store' }, 400);
  if (!ALLOWED.has(eventType)) return json({ error: 'invalid_event' }, 400);
  if (!(await storeExists(storeId))) return json({ error: 'unknown_store' }, 404);

  const watch = typeof b.watchSecond === 'number' && isFinite(b.watchSecond) ? Math.round(b.watchSecond) : null;

  const { error } = await admin.from('store_activity_events').insert({
    store_id: storeId,
    event_type: eventType,
    video_id: uuidOrNull(b.videoId),
    product_id: uuidOrNull(b.productId),
    session_id: typeof b.sessionId === 'string' ? b.sessionId.slice(0, 100) : null,
    watch_second: watch,
    metadata: {
      browser: (req.headers.get('user-agent') || '').slice(0, 300),
      page_url: typeof b.pageUrl === 'string' ? b.pageUrl.slice(0, 500) : null,
      page_path: typeof b.pagePath === 'string' ? b.pagePath.slice(0, 300) : null,
      referrer: req.headers.get('referer') || null,
      story_id: uuidOrNull(b.storyId),
      device_type: b.deviceType === 'mobile' ? 'mobile' : 'desktop',
    },
  });

  if (error) return json({ error: 'insert_failed', detail: error.message }, 500);
  return json({ ok: true });
});