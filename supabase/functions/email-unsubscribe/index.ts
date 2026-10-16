import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const enc = new TextEncoder();

async function sign(storeId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('unsub:' + storeId));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const site = (Deno.env.get('SITE_URL') || 'https://sllhub.com.br').replace(/\/$/, '');
  const back = (ok: boolean) => new Response(null, { status: 302, headers: { Location: `${site}/descadastro.html?ok=${ok ? 1 : 0}` } });
  try {
    const u = new URL(req.url);
    const s = u.searchParams.get('s') || '';
    const t = u.searchParams.get('t') || '';
    if (!/^[0-9a-f-]{36}$/i.test(s)) return back(false);
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (t !== (await sign(s, serviceKey))) return back(false);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
    const { error } = await admin.from('stores').update({ marketing_opt_out: true }).eq('id', s);
    return back(!error);
  } catch {
    return back(false);
  }
});