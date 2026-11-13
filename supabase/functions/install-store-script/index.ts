import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const BASE = Deno.env.get('SUPABASE_URL')!;
const HUB = (Deno.env.get('HUB_ORIGIN') ?? 'https://app.sllhub.com.br').replace(/\/$/, '');
const API = 'https://api.dooki.com.br/v2';
const SCRIPT_NAME = 'SLL Hub - Pulse';
const CHECKOUT_NAME = 'SLL Hub - Checkout';
const CHECKOUT_PAGES = ['checkout', 'thank-you', 'thankyou'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const admin = createClient(BASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type Conn = { store_id: string; alias: string; user_token: string; user_secret: string; script_id: number | null };

async function yampi(c: Conn, method: string, path: string, body?: unknown) {
  const r = await fetch(`${API}/${encodeURIComponent(c.alias)}/${path}`, {
    method,
    headers: { 'User-Token': c.user_token, 'User-Secret-Key': c.user_secret, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.status === 401 || r.status === 403) throw new Error('Credenciais da Yampi recusadas.');
  const t = await r.text();
  if (!r.ok && r.status !== 404) throw new Error(`Erro ${r.status} na API da Yampi: ${t.slice(0, 300)}`);
  let data: any = {};
  try { data = t ? JSON.parse(t) : {}; } catch { /* corpo nao-JSON */ }
  return { status: r.status, data };
}

async function hasActiveGate(storeId: string) {
  const now = new Date().toISOString();
  const { data } = await admin.schema('pulse').from('gates').select('id')
    .eq('store_id', storeId).eq('enabled', true).gt('ends_at', now).limit(1);
  return (data?.length ?? 0) > 0;
}

async function gateConfigJson(storeId: string): Promise<string> {
  try {
    const { data } = await admin.schema('pulse').from('gates')
      .select('id,gate_url,starts_at,ends_at,exclude_bots,preserve_params,bypass_param')
      .eq('store_id', storeId)
      .eq('enabled', true)
      .order('starts_at', { ascending: false })
      .limit(5);
    const now = Date.now();
    const g = (data || []).find((x: any) => new Date(x.ends_at).getTime() > now);
    if (!g) return '';
    return JSON.stringify({
      state: 'active', gate_id: g.id, gate_url: g.gate_url, starts_at: g.starts_at, ends_at: g.ends_at,
      exclude_bots: g.exclude_bots, preserve_params: g.preserve_params, bypass_param: g.bypass_param,
    }).replace(/</g, '\\u003c');
  } catch {
    return '';
  }
}

function buildContent(storeId: string, gate: boolean, token: string, cfg = '') {
  const loader = `<script async src="${HUB}/sll-loader.js" data-store-id="${storeId}"${token ? ` data-token="${token}"` : ""}></script>`;
  if (!gate) return loader;
  const pre = cfg ? `<script>window.__sllGateCfg=${cfg};</script>\n` : '';
  return `${pre}<script src="${HUB}/sll-gate.js"></script>\n${loader}`;
}

async function listScripts(c: Conn): Promise<any[]> {
  const r = await yampi(c, 'GET', 'store/scripts?limit=100');
  return Array.isArray(r.data?.data) ? r.data.data : [];
}

async function installCheckout(c: Conn, content: string) {
  const tried: string[] = [];
  try {
    const mine = (await listScripts(c)).filter((s) => s?.name === CHECKOUT_NAME);
    if (mine.length) {
      const page = String(mine[0].page ?? 'checkout');
      await yampi(c, 'PUT', `store/scripts/${mine[0].id}`, { name: CHECKOUT_NAME, page, content, active: true });
      return { page, id: mine[0].id, tried };
    }
    for (const page of CHECKOUT_PAGES) {
      try {
        const r = await yampi(c, 'POST', 'store/scripts', { name: CHECKOUT_NAME, page, content, active: true });
        const id = r.data?.data?.id ?? null;
        if (id) return { page, id, tried };
        tried.push(`${page}: sem id (HTTP ${r.status})`);
      } catch (e) {
        tried.push(`${page}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    tried.push(e instanceof Error ? e.message : String(e));
  }
  console.log('install-checkout falhou', JSON.stringify(tried));
  let scripts: unknown = null;
  let probe = '';
  try {
    scripts = (await listScripts(c)).map((s) => ({ id: s.id, name: s.name, page: s.page, active: s.active }));
  } catch (e) {
    scripts = e instanceof Error ? e.message : String(e);
  }
  try {
    const r = await fetch(`${API}/${encodeURIComponent(c.alias)}/store/scripts`, {
      method: 'POST',
      headers: { 'User-Token': c.user_token, 'User-Secret-Key': c.user_secret, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'SLL probe', page: 'x', content: '<!-- probe -->', active: false }),
    });
    const txt = await r.text();
    probe = `HTTP ${r.status}: ${txt.slice(0, 1500)}`;
    if (r.ok) {
      try {
        const pid = JSON.parse(txt)?.data?.id;
        if (pid) await yampi(c, 'DELETE', `store/scripts/${pid}`);
      } catch { /* sem id */ }
    }
  } catch (e) {
    probe = e instanceof Error ? e.message : String(e);
  }
  return { page: null, id: null, tried, scripts, probe };
}

async function install(c: Conn) {
  const gate = await hasActiveGate(c.store_id);
  const gateCfg = gate ? await gateConfigJson(c.store_id) : '';
  const { data: stRow } = await admin.from('stores').select('security_token').eq('id', c.store_id).maybeSingle();
  const token = String(stRow?.security_token ?? '').replace(/[^\w-]/g, '');
  const payload = { name: SCRIPT_NAME, page: 'all', content: buildContent(c.store_id, gate, token, gateCfg), active: true };
  let id: number | null = c.script_id;
  if (id) {
    const r = await yampi(c, 'PUT', `store/scripts/${id}`, payload);
    if (r.status === 404) id = null;
  }
  if (!id) {
    const r = await yampi(c, 'POST', 'store/scripts', payload);
    id = r.data?.data?.id ?? null;
    if (!id) throw new Error('A Yampi não devolveu o id do script.');
  }
  await admin.from('yampi_connections')
    .update({ script_id: id, script_gate: gate, script_updated_at: new Date().toISOString() })
    .eq('store_id', c.store_id);
  const checkout = await installCheckout(c, buildContent(c.store_id, false, token));
  return { installed: true, gate, script_id: id, checkout };
}

async function uninstall(c: Conn) {
  if (c.script_id) await yampi(c, 'DELETE', `store/scripts/${c.script_id}`);
  try {
    for (const s of (await listScripts(c)).filter((x) => x?.name === CHECKOUT_NAME)) await yampi(c, 'DELETE', `store/scripts/${s.id}`);
  } catch { /* sem script de checkout */ }
  await admin.from('yampi_connections')
    .update({ script_id: null, script_gate: false, script_updated_at: new Date().toISOString() })
    .eq('store_id', c.store_id);
  return { installed: false, gate: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const storeId = String(body.store_id ?? '');
    if (!UUID.test(storeId)) return json({ error: 'store_id inválido.' }, 400);

    const user = createClient(BASE, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: 'Não autenticado.' }, 401);
    const { data: st } = await user.from('stores').select('id').eq('id', storeId).maybeSingle();
    if (!st) return json({ error: 'Sem acesso a esta loja.' }, 403);

    const { data: c } = await admin.from('yampi_connections')
      .select('store_id,alias,user_token,user_secret,script_id').eq('store_id', storeId).maybeSingle();
    if (!c) return json({ error: 'Yampi não conectada.' }, 400);
    const conn = c as Conn;

    switch (body.action) {
      case 'status': {
        const { data } = await admin.from('yampi_connections').select('script_gate,script_updated_at').eq('store_id', storeId).maybeSingle();
        return json({ installed: !!conn.script_id, gate: !!data?.script_gate, updated_at: data?.script_updated_at ?? null });
      }
      case 'install': return json(await install(conn));
      case 'refresh': return json(conn.script_id ? await install(conn) : { installed: false });
      case 'uninstall': return json(await uninstall(conn));
      default: return json({ error: 'Ação inválida.' }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
