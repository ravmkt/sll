import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const enc = new TextEncoder();
const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function verify(body: string, h: Headers, secret: string): Promise<boolean> {
  const id = h.get('svix-id');
  const ts = h.get('svix-timestamp');
  const sigs = h.get('svix-signature');
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', b64ToBytes(secret.replace(/^whsec_/, '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${ts}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return sigs.split(' ').some((s) => s.split(',')[1] === expected);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!secret) return new Response('secret ausente', { status: 500 });
  const body = await req.text();
  if (!(await verify(body, req.headers, secret))) return new Response('assinatura invalida', { status: 401 });
  try {
    const ev = JSON.parse(body);
    const emailId = ev?.data?.email_id;
    const type = ev?.type;
    if (emailId && typeof type === 'string') {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await admin.rpc('email_track_event', { p_resend_id: emailId, p_type: type });
    }
  } catch { /* evento malformado: responde ok para o Resend nao reenviar */ }
  return new Response('ok');
});