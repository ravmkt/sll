import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const te = new TextEncoder();
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verify(body: string, req: Request, secret: string): Promise<boolean> {
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sigHeader = req.headers.get('svix-signature');
  if (!id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey('raw', b64ToBytes(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(`${id}.${ts}.${body}`)));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  const expected = btoa(bin);
  return sigHeader.split(' ').some((p) => {
    const [v, s] = p.split(',');
    return v === 'v1' && !!s && safeEqual(s, expected);
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!secret) return json({ error: 'RESEND_WEBHOOK_SECRET ausente' }, 500);

    const body = await req.text();
    if (!(await verify(body, req, secret))) return json({ error: 'assinatura invalida' }, 401);

    const evt = JSON.parse(body);
    const type = String(evt?.type || '');
    const emailId = evt?.data?.email_id ? String(evt.data.email_id) : null;
    if (!emailId) return json({ ok: true, ignored: 'sem email_id' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await admin.rpc('email_track_event', { p_resend_id: emailId, p_type: type });
    if (error) {
      console.error('email_track_event', error.message);
      return json({ error: 'rpc: ' + error.message }, 500);
    }
    return json({ ok: true, type });
  } catch (err) {
    console.error('resend-webhook', err);
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});