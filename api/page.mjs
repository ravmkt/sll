const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,120}$/;

export default async function handler(req, res) {
  const store = String(req.query.store || '');
  const slug = String(req.query.slug || '');
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

  if (!base || !UUID.test(store) || !SLUG.test(slug)) {
    res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Página não encontrada');
    return;
  }

  try {
    const r = await fetch(`${base}/storage/v1/object/public/builder-pages/${store}/${slug}/index.html`);
    if (!r.ok) {
      res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Página não encontrada');
      return;
    }
    const html = await r.text();
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; img-src https: data:; media-src https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-src https://www.youtube.com; connect-src ${base}; form-action 'none'; base-uri 'none'`
    );
    res.send(html);
  } catch {
    res.status(502).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Erro ao carregar a página');
  }
}
