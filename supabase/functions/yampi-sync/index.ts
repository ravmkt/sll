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
const COLS = 'store_id,alias,user_token,user_secret,webhook_secret,webhook_status,webhook_hmac_key';
const admin = createClient(BASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/* SLL-LIVE-SALE: grava venda atribuida a uma live (utm_source=stream_sell, utm_campaign=<id da live>) */
async function recordLiveSale(storeId: string, raw: string) {
  try {
    const evt = JSON.parse(raw);
    if (String(evt?.event ?? '') !== 'order.paid') return;
    const o = evt?.resource ?? evt?.data ?? {};
    const orderId = String(o.id ?? o.number ?? '');
    const total = Number(o.value_total ?? o.total ?? o.value ?? 0) || 0;
    const m =
      raw.match(/"utm_campaign"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/i) ??
      raw.match(/live_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const liveId = m ? m[1].toLowerCase() : '';
    const fromLive = /stream_sell/.test(raw) || /live_[0-9a-f]{8}-/i.test(raw);
    console.log('yampi-order', JSON.stringify({ store: storeId, order: orderId, total, live: liveId || null, fromLive, keys: Object.keys(o).slice(0, 40).join(',') }));
    if (!orderId || !liveId || !fromLive) return;

    const { data: live } = await admin.schema('streamsell').from('lives').select('id').eq('id', liveId).eq('store_id', storeId).maybeSingle();
    if (!live) { console.warn('yampi-order: live nao pertence a loja', liveId); return; }

    const row = { total, module: 'stream_sell', source_id: liveId, status: 'paid' };
    const { data: ex } = await admin.from('sll_conversions').select('id').eq('store_id', storeId).eq('order_id', orderId).maybeSingle();
    const res = ex
      ? await admin.from('sll_conversions').update(row).eq('id', ex.id)
      : await admin.from('sll_conversions').insert({ store_id: storeId, order_id: orderId, ...row });
    if (res.error) console.error('yampi-order: erro ao gravar', res.error.message);
  } catch (e) {
    console.error('yampi-order: falha', e instanceof Error ? e.message : String(e));
  }
}

type Conn = { store_id: string; alias: string; user_token: string; user_secret: string; webhook_secret: string; webhook_status: string | null; webhook_hmac_key: string | null };

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
  const t = await r.text();
  return t ? JSON.parse(t) : {};
}

async function fetchProducts(c: Conn) {
  const out = new Map<string, any>();
  let page = 1;
  let total = 1;
  do {
    const j = await yampi(c, `catalog/products?include=skus,texts&limit=100&page=${page}`);
    for (const p of j.data || []) out.set(String(p.id), p);
    total = Number(j.meta?.pagination?.total_pages || 1);
    page++;
  } while (page <= total);
  return out;
}

async function fetchRemote(c: Conn, storeId: string, onlyProduct?: string) {
  if (onlyProduct) {
    const { data } = await admin.from('products').select('external_id').eq('id', onlyProduct).eq('store_id', storeId).maybeSingle();
    if (data?.external_id) {
      try {
        const j = await yampi(c, `catalog/products/${encodeURIComponent(String(data.external_id))}?include=skus,texts`);
        if (j?.data?.id) return new Map<string, any>([[String(j.data.id), j.data]]);
      } catch { /* cai para a listagem completa */ }
    }
  }
  return fetchProducts(c);
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

function findSecret(o: unknown): string | null {
  if (typeof o === 'string') return o.startsWith('wh_') ? o : null;
  if (o && typeof o === 'object') {
    for (const v of Object.values(o as Record<string, unknown>)) {
      const r = findSecret(v);
      if (r) return r;
    }
  }
  return null;
}

async function registerWebhook(c: Conn) {
  let status = 'ok';
  let key = c.webhook_hmac_key;
  try {
    const list = await yampi(c, 'webhooks?limit=100');
    const mine: any[] = (list.data || []).filter((w: any) => String(w.url || '').startsWith(SELF));
    if (mine.length && !key) {
      key = findSecret(mine);
      if (!key) {
        try { key = findSecret(await yampi(c, `webhooks/${mine[0].id}`)); } catch { /* segue */ }
      }
      if (!key) {
        for (const w of mine) await yampi(c, `webhooks/${w.id}`, { method: 'DELETE' });
        mine.length = 0;
      }
    }
    if (!mine.length) {
      const created = await yampi(c, 'webhooks', {
        method: 'POST',
        body: JSON.stringify({ name: 'SLL - sincronismo', url: `${SELF}?s=${c.webhook_secret}`, events: EVENTS }),
      });
      key = findSecret(created) ?? key;
      if (!key) console.warn('yampi-hmac: chave wh_ nao encontrada na resposta', JSON.stringify(created).slice(0, 500));
    }
  } catch (e) {
    status = `erro: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400);
  }
  await admin.from('yampi_connections').update({ webhook_status: status, webhook_hmac_key: key }).eq('store_id', c.store_id);
  return status;
}

async function hmacKind(raw: string, key: string | null, header: string | null) {
  if (!key || !header) return null;
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  const strip = (s: string) => s.replace(/=+$/, '');
  const h = strip(header.trim());
  if (h === strip(btoa(String.fromCharCode(...sig)))) return 'b64_binario';
  if (h === strip(btoa(hex))) return 'b64_hex';
  return null;
}

function cleanDesc(s: unknown): string | null {
  const v = String(s ?? '')
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 600);
  return v || null;
}

async function syncStore(storeId: string, onlyProduct?: string) {
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
    const remote = await fetchRemote(c, storeId, onlyProduct);
        const toks: { ext: string; token: string; url: string; stock: number }[] = [];
        for (const y of remote.values()) {
          for (const k of (y.skus?.data ?? [])) {
            if (k.token) toks.push({ ext: String(k.id), token: String(k.token), url: String(k.purchase_url || ''), stock: Number(k.total_in_stock) || 0 });
          }
        }
    const prods = await pageAll<any>((a, b) =>
      admin.from('products').select('id,external_id,price,short_description').eq('store_id', storeId).eq('source_platform', 'yampi').order('id').range(a, b));
    const vars = await pageAll<any>((a, b) =>
      admin.from('product_variants').select('id,product_id,external_id,price,sale_price,stock,sync_hold_until').eq('store_id', storeId).order('id').range(a, b));
    const byProd = new Map<string, any[]>();
    for (const v of vars) { const l = byProd.get(v.product_id) || []; l.push(v); byProd.set(v.product_id, l); }

    const now = new Date().toISOString();
    const jobs: (() => Promise<void>)[] = [];
    for (const p of onlyProduct ? prods.filter((x) => x.id === onlyProduct) : prods) {
      const y = remote.get(String(p.external_id));
      if (!y) { s.not_found++; continue; }
      const desc = cleanDesc(y.texts?.data?.description);
      if (desc && !String(p.short_description ?? '').trim()) {
        jobs.push(async () => {
          const { error } = await admin.from('products').update({ short_description: desc }).eq('id', p.id);
          if (error) s.failed++;
        });
      }
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
          if (!(v.sync_hold_until && new Date(v.sync_hold_until).getTime() > Date.now()) && (Number(v.price) !== price || Number(v.sale_price ?? 0) !== Number(sale ?? 0) || Number(v.stock) !== stock)) {
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
        for (let n = 0; n < toks.length; n += 500) {
          const { error } = await admin.rpc('yampi_apply_tokens', { p_store: storeId, p_items: toks.slice(n, n + 500) });
          if (error) s.failed++;
        }
    let mark = admin.from('products').update({ last_synced_at: now }).eq('store_id', storeId).eq('source_platform', 'yampi');
    if (onlyProduct) mark = mark.eq('id', onlyProduct);
    await mark;
    if (!onlyProduct) {
      await admin.from('yampi_connections').update({ last_sync_at: now, last_sync_summary: s }).eq('store_id', storeId);
      await admin.from('yampi_connections').update({ dirty_at: null }).eq('store_id', storeId).lte('dirty_at', started.toISOString());
    }
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
      const raw = await req.text();
      const { data: c } = await admin.from('yampi_connections').select('store_id,webhook_hmac_key').eq('webhook_secret', hook).maybeSingle();
      if (!c) return json({ error: 'invalid' }, 401);
      const hdr = req.headers.get('x-yampi-hmac-sha256');
      const kind = await hmacKind(raw, c.webhook_hmac_key, hdr);
      console.log('yampi-hmac', JSON.stringify({ store: c.store_id, key: !!c.webhook_hmac_key, header: !!hdr, ok: kind }));
      if (Deno.env.get('YAMPI_HMAC_ENFORCE') === 'true' && c.webhook_hmac_key && !kind) return json({ error: 'invalid signature' }, 401);
      await admin.from('yampi_connections').update({ dirty_at: new Date().toISOString() }).eq('store_id', c.store_id);
      await recordLiveSale(c.store_id, raw);
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
            if (body.action === 'push') {
          const { data: pv } = await admin.from('product_variants').select('external_id').eq('store_id', c.store_id).eq('sku', String(body.sku || '')).maybeSingle();
          if (!pv?.external_id) return json({ error: 'SKU sem external_id.' }, 400);
          await admin.from('product_variants').update({ sync_hold_until: new Date(Date.now() + 60000).toISOString() }).eq('store_id', c.store_id).eq('sku', String(body.sku));
          const id = encodeURIComponent(String(pv.external_id));
          const res: Record<string, unknown> = {};
          if (body.price !== undefined) {
            const price = Number(body.price);
            const sale = Number(body.sale_price ?? 0) || 0;
            if (!(price > 0) || sale < 0 || (sale > 0 && sale >= price)) return json({ error: 'Preco invalido.' }, 400);
            const cur = (await yampi(c, `catalog/skus/${id}`)).data;
            await yampi(c, `catalog/skus/${id}`, {
              method: 'PUT',
              body: JSON.stringify({
                product_id: cur.product_id, sku: cur.sku, barcode: cur.barcode, erp_id: cur.erp_id,
                blocked_sale: cur.blocked_sale, quantity_managed: cur.quantity_managed, price_cost: cur.price_cost,
                price_sale: price, price_discount: sale,
                weight: cur.weight, height: cur.height, width: cur.width, length: cur.length,
              }),
            });
            res.price = 'ok';
          }
          if (body.stock !== undefined) {
            const qty = Math.floor(Number(body.stock));
            if (!Number.isFinite(qty) || qty < 0) return json({ error: 'Estoque invalido.' }, 400);
            const lines: any[] = (await yampi(c, `catalog/skus/${id}/stocks`)).data ?? [];
            if (lines.length !== 1) return json({ error: `SKU com ${lines.length} linhas de estoque; envio bloqueado.` }, 400);
            await yampi(c, `catalog/skus/${id}/stocks/${lines[0].id}`, {
              method: 'PUT',
              body: JSON.stringify({ stock_id: lines[0].stock_id, quantity: qty, min_quantity: lines[0].min_quantity ?? 0 }),
            });
            res.stock = 'ok';
          }
          const after = (await yampi(c, `catalog/skus/${id}`)).data;
          res.after = { price_sale: after.price_sale, price_discount: after.price_discount, total_in_stock: after.total_in_stock };
          return json(res);
        }
        if (body.action === 'register_webhook') return json({ status: await registerWebhook(c) });
        if (body.action === 'probe') {
          const { data: pv } = await admin.from('product_variants').select('external_id').eq('store_id', c.store_id).eq('sku', String(body.sku || '')).maybeSingle();
          if (!pv?.external_id) return json({ error: 'SKU sem external_id.' }, 400);
          const out: Record<string, unknown> = { external_id: pv.external_id };
          for (const p of [`catalog/skus/${pv.external_id}`, `catalog/skus/${pv.external_id}/stocks`]) {
            try { out[p] = await yampi(c, p); } catch (e) { out[p] = { error: e instanceof Error ? e.message : String(e) }; }
          }
          return json(out);
        }
    if (body.action === 'sync') {
      if (!body.product_id && c.webhook_status !== 'ok') await registerWebhook(c);
      const r = await syncStore(c.store_id, body.product_id ? String(body.product_id) : undefined);
      if (!r) return json({ error: 'Já existe uma sincronização em andamento. Tente em instantes.' }, 400);
      return json(r);
    }
    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});