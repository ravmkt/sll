import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: isSuper } = await userClient.rpc('is_superadmin');
    if (isSuper !== true) return json({ error: 'Acesso negado.' }, 403);

    const body = await req.json().catch(() => ({}));
    const storeId = String(body?.store_id || '');
    const subject = String(body?.subject || '').trim().slice(0, 200);
    const message = String(body?.message || '').trim().slice(0, 10000);
    if (!storeId || !subject || !message) return json({ error: 'Informe assunto e mensagem.' }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: st } = await admin.from('stores').select('name,contact_email,owner_contact_email').eq('id', storeId).maybeSingle();
    const to = String(st?.contact_email || st?.owner_contact_email || '').trim();
    if (!to) return json({ error: 'A loja não tem e-mail de contato cadastrado.' }, 400);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'Chave do Resend não configurada.' }, 500);
    const from = Deno.env.get('MAIL_FROM') || 'SLL Hub <no-reply@sllhub.com.br>';

    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b">${esc(message).replace(/\n/g, '<br>')}<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="font-size:12px;color:#64748b">Equipe SLL Hub</p></div>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text: message }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ error: `Resend recusou o envio (HTTP ${res.status}). ${t.slice(0, 200)}` }, 502);
    }
    return json({ ok: true, to });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});