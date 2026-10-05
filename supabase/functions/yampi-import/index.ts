import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const API = 'https://api.dooki.com.br/v2';

type Cred = { alias: string; token: string; secret: string };

async function yampi(c: Cred, path: string) {
  const r = await fetch(`${API}/${encodeURIComponent(c.alias)}/${path}`, {
    headers: { 'User-Token': c.token, 'User-Secret-Key': c.secret, Accept: 'application/json' },
  });
  if (!r.ok) {
    throw new Error(
      r.status === 401 || r.status === 403
        ? 'Credenciais da Yampi recusadas.'
        : `Erro ${r.status} na API da Yampi (confira alias, token e chave).`,
    );
  }
  return r.json();
}

async function all(c: Cred, path: string) {
  const out: any[] = [];
  let page = 1;
  let total = 1;
  do {
    const sep = path.includes('?') ? '&' : '?';
    const j = await yampi(c, `${path}${sep}limit=100&page=${page}`);
    out.push(...(j.data || []));
    total = Number(j.meta?.pagination?.total_pages || 1);
    page++;
  } while (page <= total);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, store_id, alias, token, secret } = await req.json();
    const url = Deno.env.get('SUPABASE_URL')!;
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: 'Não autenticado.' }, 401);
    const { data: st } = await user.from('stores').select('id').eq('id', store_id).maybeSingle();
    if (!st) return json({ error: 'Sem acesso a esta loja.' }, 403);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: conn } = await admin.from('yampi_connections').select('alias,user_token,user_secret').eq('store_id', store_id).maybeSingle();

    if (action === 'status') return json({ connected: !!conn, alias: conn?.alias ?? '' });

    if (action === 'save') {
      const c: Cred = { alias: String(alias || '').trim(), token: String(token || '').trim(), secret: String(secret || '').trim() };
      if (!c.alias || !c.token || !c.secret) return json({ error: 'Preencha alias, token e chave.' }, 400);
      await yampi(c, 'catalog/categories?limit=1');
      const { error } = await admin.from('yampi_connections').upsert({
        store_id, alias: c.alias, user_token: c.token, user_secret: c.secret, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === 'fetch') {
      if (!conn) return json({ error: 'Yampi não conectada.' }, 400);
      const c: Cred = { alias: conn.alias, token: conn.user_token, secret: conn.user_secret };
      const cats = await all(c, 'catalog/categories');
      const parents = new Set(cats.filter((x: any) => x.parent_id).map((x: any) => x.parent_id));
      const prods = await all(c, 'catalog/products?include=categories,skus,images');
      const products = prods.map((p: any) => {
        const cs: any[] = p.categories?.data ?? [];
        const tree = cs.find((x) => x.parent_id);
        const root = cs.find((x) => !x.parent_id && parents.has(x.id));
        const loose = cs.filter((x) => !x.parent_id && !parents.has(x.id)).map((x) => x.name);
        const tier = tree ? 'tree' : root ? 'root' : loose.length ? 'loose' : 'none';
        const imgs = (p.images?.data ?? []).map((i: any) => i.large?.url || i.medium?.url).filter(Boolean);
        return {
          id: String(p.id),
          name: p.name,
          active: !!p.active,
          url: p.url || '',
          image: imgs[0] || '',
          images: imgs,
          category: tree?.name || root?.name || '',
          tier,
          loose,
          skus: (p.skus?.data ?? []).map((s: any) => ({
            id: String(s.id),
            sku: s.sku || '',
            title: s.title || '',
            option: (s.variations ?? []).map((v: any) => v.name).join(' / '),
            value: (s.variations ?? []).map((v: any) => v.value).join(' / '),
            price: Number(s.price_sale) || 0,
            sale: Number(s.price_discount) || 0,
            stock: Number(s.total_in_stock) || 0,
          })),
        };
      });
      return json({ products, categories: cats.length });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});