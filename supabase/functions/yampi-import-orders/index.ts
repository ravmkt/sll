import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const API = 'https://api.dooki.com.br/v2';
const INCLUDES = [
  'customer,items.sku,status,statuses,shipping_address,search',
  'customer,items,status,statuses,shipping_address',
  'customer,items,status,shipping_address',
];
const KNOWN = new Set(['waiting_payment', 'paid', 'handling_products', 'shipped', 'delivered', 'cancelled']);

type Cred = { alias: string; token: string; secret: string };

async function yampi(c: Cred, path: string) {
  const r = await fetch(`${API}/${encodeURIComponent(c.alias)}/${path}`, {
    headers: { 'User-Token': c.token, 'User-Secret-Key': c.secret, Accept: 'application/json' },
  });
  if (!r.ok) {
    throw new Error(
      r.status === 401 || r.status === 403
        ? 'Credenciais da Yampi recusadas.'
        : `Erro ${r.status} na API da Yampi: ${(await r.text().catch(() => '')).slice(0, 200)}`,
    );
  }
  return r.json();
}

async function getPage(c: Cred, page: number, limit: number) {
  let last: unknown = null;
  for (const inc of INCLUDES) {
    try {
      return { j: await yampi(c, `orders?include=${inc}&limit=${limit}&page=${page}`), inc };
    } catch (e) {
      last = e;
      if (e instanceof Error && e.message.includes('recusadas')) throw e;
    }
  }
  throw last;
}

const shape = (v: any): unknown => {
  if (Array.isArray(v)) return v.length ? [shape(v[0])] : [];
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]));
  return v === null ? 'null' : typeof v;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, store_id, from_page = 1, pages = 3 } = await req.json();
    const url = Deno.env.get('SUPABASE_URL')!;
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: 'Não autenticado.' }, 401);
    const { data: st } = await user.from('stores').select('id').eq('id', store_id).maybeSingle();
    if (!st) return json({ error: 'Sem acesso a esta loja.' }, 403);
    const { data: can } = await user.rpc('gestor_can', { p_store: store_id, p_area: 'configuracoes', p_action: 'editar' });
    if (!can) return json({ error: 'Sem permissão para importar.' }, 403);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: conn } = await admin.from('yampi_connections').select('alias,user_token,user_secret').eq('store_id', store_id).maybeSingle();
    if (!conn) return json({ error: 'Yampi não conectada.' }, 400);
    const c: Cred = { alias: conn.alias, token: conn.user_token, secret: conn.user_secret };

    if (action === 'probe') {
      const { j, inc } = await getPage(c, 1, 1);
      const o = (j.data || [])[0];
      let totalClientes: number | null = null;
      try {
        const cj = await yampi(c, 'customers?limit=1&page=1');
        const n = cj?.meta?.pagination?.total;
        totalClientes = n == null ? null : Number(n);
      } catch { /* endpoint indisponivel: segue sem a contagem de clientes */ }
      return json({
        include_usado: inc,
        total_pedidos: Number(j.meta?.pagination?.total || 0),
        total_clientes: totalClientes,
        estrutura_do_primeiro_pedido: o ? shape(o) : null,
      });
    }

    if (action === 'import') {
      const span = Math.min(5, Math.max(1, Number(pages) || 3));
      const first = Math.max(1, Number(from_page) || 1);
      let next = first;
      let totalPages = first + span;
      let totalOrders = 0;
      const res = { processed: 0, ok: 0, failed: 0, no_items: 0, errors: [] as string[], unknown_status: {} as Record<string, number> };

      while (next < first + span && next <= totalPages) {
        const { j } = await getPage(c, next, 100);
        totalPages = Number(j.meta?.pagination?.total_pages || 1);
        totalOrders = Number(j.meta?.pagination?.total || 0);
        const list: any[] = j.data || [];
        for (let i = 0; i < list.length; i += 10) {
          await Promise.all(list.slice(i, i + 10).map(async (o) => {
            res.processed++;
            const items = o.items?.data ?? o.items;
            if (!Array.isArray(items) || items.length === 0) res.no_items++;
            const alias = String(o.status?.data?.alias ?? o.status?.alias ?? '');
            if (alias && !KNOWN.has(alias)) res.unknown_status[alias] = (res.unknown_status[alias] || 0) + 1;
            const { data, error } = await admin.rpc('gestor_ingest_yampi_order', {
              p_payload: { event: 'order.imported', merchant: { alias: c.alias }, resource: o },
            });
            if (error || !data) {
              res.failed++;
              if (res.errors.length < 5) res.errors.push(`#${o.number ?? o.id}: ${error?.message ?? 'nao gravado'}`);
            } else res.ok++;
          }));
        }
        next++;
      }
      return json({ ...res, next_page: next, total_pages: totalPages, total_orders: totalOrders, done: next > totalPages });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});