import { OFFLINE_PREFIX, OFFLINE_TTL_MS } from './offlineCache';

const RPC = /\/rest\/v1\/rpc\/(is_superadmin|get_store_active_modules|gestor_my_access|gestor_my_sale_channels|gestor_cash_current|gestor_fin_get|gestor_channels_get)(\?|$)/;
const TABLE = /\/rest\/v1\/(stores|subscriptions|store_members)(\?|$)/;
const MAX_BYTES = 200_000;

function sub(auth: string | null): string {
  try {
    const p = (auth || '').replace(/^Bearer\s+/i, '').split('.')[1];
    if (!p) return 'anon';
    return String(JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).sub || 'anon');
  } catch { return 'anon'; }
}

function install() {
  if (typeof window === 'undefined' || (window as any).__sllOfflineFetch) return;
  (window as any).__sllOfflineFetch = true;
  const orig = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
    const method = (init?.method || 'GET').toUpperCase();
    const ok = !!url && ((method === 'POST' && RPC.test(url)) || (method === 'GET' && (TABLE.test(url) || RPC.test(url))));
    if (!ok) return orig(input, init);

    const h = new Headers(init?.headers);
    const body = typeof init?.body === 'string' ? init.body : '';
    const key = OFFLINE_PREFIX + 'f:' + sub(h.get('authorization')) + '|' + method + '|' + url + '|' + (h.get('accept') || '') + '|' + body;

    try {
      const res = await orig(input, init);
      if (res.ok) {
        res.clone().text().then((txt) => {
          if (txt.length > MAX_BYTES) return;
          try {
            localStorage.setItem(key, JSON.stringify({
              t: Date.now(), b: txt, ct: res.headers.get('content-type') || 'application/json', cr: res.headers.get('content-range') || '',
            }));
          } catch { /* sem espaco */ }
        }).catch(() => undefined);
      }
      return res;
    } catch (e) {
      if (!(e instanceof TypeError)) throw e; // aborto e outros erros seguem normalmente
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const o = JSON.parse(raw);
          if (Date.now() - o.t <= OFFLINE_TTL_MS) {
            const headers: Record<string, string> = { 'content-type': o.ct, 'x-sll-offline-cache': '1' };
            if (o.cr) headers['content-range'] = o.cr;
            return new Response(o.b, { status: 200, headers });
          }
        }
      } catch { /* sem cache valido */ }
      throw e;
    }
  };
}

install();