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
    const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: isSuper } = await asUser.rpc('is_superadmin');
    if (isSuper !== true) return json({ error: 'Acesso negado.' }, 403);
    const { data: me } = await asUser.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const storeId = String(body?.store_id || '');
    if (!storeId) return json({ error: 'Informe a loja.' }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: st } = await admin.from('stores').select('name, contact_name, owner_user_id').eq('id', storeId).maybeSingle();
    if (!st?.owner_user_id) return json({ error: 'A loja não tem usuário dono.' }, 404);

    const { data: u, error: uErr } = await admin.auth.admin.getUserById(st.owner_user_id);
    const email = u?.user?.email;
    if (uErr || !email) return json({ error: 'Usuário dono sem e-mail de login.' }, 404);

    const { data: link, error: lErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/redefinir-senha` },
    });
    const actionLink = link?.properties?.action_link;
    if (lErr || !actionLink) return json({ error: lErr?.message || 'Não foi possível gerar o link.' }, 500);

    let emailSent = false;
    let emailError = '';
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('MAIL_FROM');
    if (!apiKey || !from) {
      emailError = 'Resend não configurado.';
    } else {
      const first = esc(String(st.contact_name || '').trim().split(/\s+/)[0] || 'tudo bem');
      const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b">
<p>Olá, ${first}.</p>
<p>Recebemos o pedido para redefinir a senha de acesso ao <b>SLL Hub</b>. Clique no botão abaixo para criar uma nova senha.</p>
<p style="margin:24px 0"><a href="${actionLink}" style="background:#0094eb;color:#fff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:10px;display:inline-block">Criar nova senha</a></p>
<p style="font-size:13px;color:#64748b">O link expira em pouco tempo e só funciona uma vez. Se você não esperava este e-mail, ignore-o.</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="font-size:12px;color:#64748b">Equipe SLL Hub</p></div>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject: 'Redefinição de senha do SLL Hub', html }),
      });
      emailSent = res.ok;
      if (!res.ok) emailError = `Resend recusou (HTTP ${res.status}).`;
    }

    await admin.from('admin_audit_logs').insert({
      admin_id: me?.user?.id ?? null,
      action: 'store_password_reset',
      details: { store_id: storeId, store_name: st.name, email, email_sent: emailSent },
    });

    return json({ ok: true, email, link: actionLink, email_sent: emailSent, email_error: emailError || undefined });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});