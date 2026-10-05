import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const BASE = Deno.env.get('SUPABASE_URL')!;
const SELF = `${BASE}/functions/v1/yampi-sync`;
const API = 'https://api.dooki.com.br/v2';
const EVENTS = ['product.inventory.updated', 'product.updated', 'order.paid'];
const COLS = 'store_id,alias,user_token,user_secret,webhook_secret,webhook_status';
const admin = createClient(BASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type Conn = { store_id: string; alias: string; user_token: string; user_secret: string; webhook_secret: string; webhook_status: string | null };

async function yampi(c: Conn, path: string, init: RequestInit = {}) {
  const r = await fetch(`${API}/${encodeURIComponent(c.alias)}/${path}`, {
    ...init,
    headers: { 'User-Token': c.user_token, 'User-Secret-Key': c.user_secret, Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) throw new Error('Credenciais da Yampi recusadas.');
    const d = (await r.text().catch(() => '')).slice(0, 300);
    throw new Error(`Erro ${r.status} na API da Yampi: ${d}`);
  }
  return r.json();
}

async function fetchProducts(c: Conn) {
  const out = new Map<string, any>();
  let page = 1;
  let total = 1;
  do {
    const j = await yampi(c, `catalog/products?include=skus&limit=100&page=${page}`);
    for (const p of j.data || []) out.set(String(p.id), p);
    total = Number(j.meta?.pagination?.total_pages || 1);
    page++;
  } while (page <= total);
  return out;
}

async function pageAll<T>(q: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const getConn = async (id: string) =>
  ((await admin.from('yampi_connections').select(COLS).eq('store_id', id).maybeSingle()).data ?? null) as Conn | null;

async function registerWebhook(c: Conn) {
  let status = 'ok';
  try {
    const list = await yampi(c, 'webhooks?limit=100');
    const has = (list.data || []).some((w: any) => String(w.url || '').startsWith(SELF));
    if (!has) {
      await yampi(c, 'webhooks', {
        method: 'POST',
        body: JSON.stringify({ name: 'SLL - sincronismo', url: `${SELF}?s=${c.webhook_secret}`, events: EVENTS }),
      });
    }
  } catch (e) {
    status = `erro: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400);
  }
  await admin.from('yampi_connections').update({ webhook_status: status }).eq('store_id', c.store_id);
  return status;
}

async function syncStore(storeId: string) {
  const started = new Date();
  const { data: claimed } = await admin.from('yampi_connections')
    .update({ syncing_until: new Date(Date.now() + 5 * 60000).toISOString() })
    .eq('store_id', storeId)
    .or(`syncing_until.is.null,syncing_until.lt.${started.toISOString()}`)
    .select(COLS);
  const c = (claimed?.[0] ?? null) as Conn | null;
  if (!c) return null;
  const s = { products: 0, variants_updated: 0, variants_added: 0, prices_updated: 0, not_found: 0, failed: 0 };
  try {
    const remote = await fetchProducts(c);
    const prods = await pageAll<any>((a, b) =>
      admin.from('products').select('id,external_id,price').eq('store_id', storeId).eq('source_platform', 'yampi').order('id').range(a, b));
    const vars = await pageAll<any>((a, b) =>
      admin.from('product_variants').select('id,product_id,external_id,price,sale_price,stock').eq('store_id', storeId).order('id').range(a, b));
    const byProd = new Map<string, any[]>();
    for (const v of vars) { const l = byProd.get(v.product_id) || []; l.push(v); byProd.set(v.product_id, l); }

    const now = new Date().toISOString();
    const jobs: (() => Promise<void>)[] = [];
    for (const p of prods) {
      const y = remote.get(String(p.external_id));
      if (!y) { s.not_found++; continue; }
      const skus: any[] = y.skus?.data ?? [];
      if (!skus.length) continue;
      s.products++;
      const local = byProd.get(p.id) || [];
      const seen = new Set<string>();
      const prices: number[] = [];
      skus.forEach((k, i) => {
        const ext = String(k.id);
        seen.add(ext);
        const price = Number(k.price_sale) || 0;
        const disc = Number(k.price_discount) || 0;
        const sale = disc > 0 && disc < price ? disc : null;
        const stock = Number(k.total_in_stock) || 0;
        if (price > 0) prices.push(price);
        const v = local.find((x) => String(x.external_id) === ext);
        if (v) {
          if (Number(v.price) !== price || Number(v.sale_price ?? 0) !== Number(sale ?? 0) || Number(v.stock) !== stock) {
            jobs.push(async () => {
              const { error } = await admin.from('product_variants').update({ price, sale_price: sale, stock, updated_at: now }).eq('id', v.id);
              if (error) s.failed++; else s.variants_updated++;
            });
          }
          return;
        }
        const sku = String(k.sku || '').trim();
        if (!sku) return;
        jobs.push(async () => {
          const { error } = await admin.from('product_variants').insert({
            store_id: storeId, product_id: p.id, external_id: ext, sku, title: k.title || '',
            option_name: (k.variations ?? []).map((x: any) => x.name).join(' / ') || null,
            option_value: (k.variations ?? []).map((x: any) => x.value).join(' / ') || null,
            price, sale_price: sale, stock, position: i,
          });
          if (error) s.failed++; else s.variants_added++;
        });
      });
      for (const v of local) {
        if (!seen.has(String(v.external_id)) && Number(v.stock) !== 0) {
          jobs.push(async () => {
            const { error } = await admin.from('product_variants').update({ stock: 0, updated_at: now }).eq('id', v.id);
            if (error) s.failed++; else s.variants_updated++;
          });
        }
      }
      if (prices.length) {
        const min = Math.min(...prices);
        if (Number(p.price) !== min) {
          jobs.push(async () => {
            const { error } = await admin.from('products').update({ price: min }).eq('id', p.id);
            if (error) s.failed++; else s.prices_updated++;
          });
        }
      }
    }
    for (let i = 0; i < jobs.length; i += 10) await Promise.all(jobs.slice(i, i + 10).map((j) => j()));
    await admin.from('products').update({ last_synced_at: now }).eq('store_id', storeId).eq('source_platform', 'yampi');
    await admin.from('yampi_connections').update({ last_sync_at: now, last_sync_summary: s }).eq('store_id', storeId);
    await admin.from('yampi_connections').update({ dirty_at: null }).eq('store_id', storeId).lte('dirty_at', started.toISOString());
    return s;
  } catch (e) {
    await admin.from('yampi_connections')
      .update({ last_sync_summary: { error: e instanceof Error ? e.message : String(e) } }).eq('store_id', storeId);
    throw e;
  } finally {
    await admin.from('yampi_connections').update({ syncing_until: null }).eq('store_id', storeId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const hook = new URL(req.url).searchParams.get('s');
    if (hook) {
      const { data: c } = await admin.from('yampi_connections').select('store_id').eq('webhook_secret', hook).maybeSingle();
      if (!c) return json({ error: 'invalid' }, 401);
      await admin.from('yampi_connections').update({ dirty_at: new Date().toISOString() }).eq('store_id', c.store_id);
      EdgeRuntime.waitUntil(syncStore(c.store_id).catch(() => null));
      return json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const key = Deno.env.get('CRON_KEY');
    if (body.action === 'cron') {
      if (!key || req.headers.get('x-cron-key') !== key) return json({ error: 'forbidden' }, 403);
      const cutoff = new Date(Date.now() - 30 * 60000).toISOString();
      const { data } = await admin.from('yampi_connections').select('store_id')
        .or(`dirty_at.not.is.null,last_sync_at.is.null,last_sync_at.lt.${cutoff}`).limit(20);
      EdgeRuntime.waitUntil((async () => { for (const r of data || []) await syncStore(r.store_id).catch(() => null); })());
      return json({ queued: data?.length ?? 0 });
    }

    const user = createClient(BASE, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: 'Não autenticado.' }, 401);
    const { data: st } = await user.from('stores').select('id').eq('id', body.store_id).maybeSingle();
    if (!st) return json({ error: 'Sem acesso a esta loja.' }, 403);
    const c = await getConn(body.store_id);
    if (!c) return json({ error: 'Yampi não conectada.' }, 400);

    if (body.action === 'info') {
      const { data } = await admin.from('yampi_connections').select('last_sync_at,webhook_status').eq('store_id', c.store_id).maybeSingle();
      return json(data ?? {});
    }
    if (body.action === 'register_webhook') return json({ status: await registerWebhook(c) });
    if (body.action === 'sync') {
      if (c.webhook_status !== 'ok') await registerWebhook(c);
      const r = await syncStore(c.store_id);
      if (!r) return json({ error: 'Já existe uma sincronização em andamento. Tente em instantes.' }, 400);
      return json(r);
    }
    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});