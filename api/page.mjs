const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,120}$/;
const APP_HOSTS = new Set(['app.sllhub.com.br']);

function fail(res, code, msg) {
  res.status(code).setHeader('Content-Type', 'text/plain; charset=utf-8').send(msg);
}

async function rpc(base, key, fn, args) {
  const r = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) return null;
  const v = await r.json();
  return typeof v === 'string' && UUID.test(v) ? v : null;
}

export default async function handler(req, res) {
  const ref = String(req.query.store || '');
  const slug = String(req.query.slug || '');
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!base || !key || !SLUG.test(slug)) return fail(res, 404, 'Página não encontrada');

  try {
    let store = null;
    if (ref) {
      if (UUID.test(ref)) store = ref;
      else if (SLUG.test(ref)) store = await rpc(base, key, 'builder_store_by_slug', { p_slug: ref });
    } else {
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
      if (host && !APP_HOSTS.has(host)) store = await rpc(base, key, 'builder_store_by_domain', { p_host: host });
    }
    if (!store) return fail(res, 404, 'Página não encontrada');

    const r = await fetch(`${base}/storage/v1/object/public/builder-pages/${store}/${slug}/index.html?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return fail(res, 404, 'Página não encontrada');

    const html = await r.text();
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; img-src https: data:; media-src https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-src https://www.youtube.com; connect-src ${base}; form-action 'none'; base-uri 'none'`
    );
    res.send(html);
  } catch {
    fail(res, 502, 'Erro ao carregar a página');
  }
}