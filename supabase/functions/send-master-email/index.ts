import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const custom = String(body?.to || '').trim();
    if (!storeId || !subject || !message) return json({ error: 'Informe assunto e mensagem.' }, 400);
    if (custom && !EMAIL_RE.test(custom)) return json({ error: 'E-mail do destinatário inválido.' }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let to = custom;
    if (!to) {
      const { data: st, error: stErr } = await admin
        .from('stores').select('owner_user_id, owner_contact_email').eq('id', storeId).maybeSingle();
      if (stErr) return json({ error: `Erro ao ler a loja: ${stErr.message}` }, 500);
      if (!st) return json({ error: 'Loja não encontrada.' }, 404);
      to = String(st.owner_contact_email || '').trim();
      if (!to && st.owner_user_id) {
        const { data } = await admin.auth.admin.getUserById(st.owner_user_id);
        to = String(data?.user?.email || '').trim();
      }
    }
    if (!to) return json({ error: 'A loja não tem e-mail cadastrado. Informe o destinatário.' }, 400);

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
      return json({ error: `Resend recusou o envio (HTTP ${res.status}). ${t.slice(0, 300)}` }, 502);
    }
    return json({ ok: true, to });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});