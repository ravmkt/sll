import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const AUDIENCES = ['all', 'past_due', 'trial', 'store'];
const MAX_RECIPIENTS = 1000;
const enc = new TextEncoder();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sign(storeId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('unsub:' + storeId));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function finalize(html: string, unsubUrl: string | null): string {
  const foot = unsubUrl
    ? `Não quer mais receber nossas novidades? <a href="${unsubUrl}" style="color:#64748b">Cancelar inscrição</a>`
    : '';
  if (html.includes('%%UNSUB%%')) return html.replace('%%UNSUB%%', foot);
  return foot ? html + `<p style="font-size:12px;color:#64748b;text-align:center">${foot}</p>` : html;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: isSuper } = await userClient.rpc('is_superadmin');
    if (isSuper !== true) return json({ error: 'Acesso negado.' }, 403);
    const { data: ud } = await userClient.auth.getUser();
    const adminId = ud?.user?.id ?? null;
    const adminEmail = ud?.user?.email ?? null;

    const body = await req.json().catch(() => ({}));
    const subject = String(body?.subject || '').trim().slice(0, 200);
    const text = String(body?.text || body?.message || '').trim().slice(0, 10000);
    let html = String(body?.html || '').trim();
    const audience = String(body?.audience || 'all');
    const storeId = body?.store_id ? String(body.store_id) : null;
    const test = body?.test === true;
    const blocks = Array.isArray(body?.blocks) && JSON.stringify(body.blocks).length < 200000 ? body.blocks : null;
    if (!subject) return json({ error: 'Informe o assunto.' }, 400);
    if (!html) {
      if (!text) return json({ error: 'Informe o conteúdo do e-mail.' }, 400);
      html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b">${esc(text).replace(/\n/g, '<br>')}<p>%%UNSUB%%</p></div>`;
    }
    if (html.length > 300000) return json({ error: 'E-mail grande demais.' }, 400);
    if (/<script/i.test(html)) return json({ error: 'HTML inválido.' }, 400);
    if (!AUDIENCES.includes(audience)) return json({ error: 'Público inválido.' }, 400);
    if (audience === 'store' && !storeId) return json({ error: 'Escolha a loja que vai receber.' }, 400);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'Chave do Resend não configurada.' }, 500);
    const from = Deno.env.get('MAIL_FROM') || 'SLL Hub <no-reply@sllhub.com.br>';
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    if (test) {
      if (!adminEmail) return json({ error: 'Seu usuário não tem e-mail para receber o teste.' }, 400);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers,
        body: JSON.stringify({ from, to: [adminEmail], subject: '[TESTE] ' + subject, html: finalize(html, null), text }),
      });
      if (!res.ok) return json({ error: `Resend recusou o teste (HTTP ${res.status}). ${(await res.text()).slice(0, 200)}` }, 502);
      return json({ ok: true, to: adminEmail });
    }

    const admin = createClient(url, serviceKey);
    const { data: rec, error: recErr } = await admin.rpc('email_campaign_recipients', { p_audience: audience, p_store_id: storeId });
    if (recErr) return json({ error: 'Erro ao buscar destinatários: ' + recErr.message }, 500);
    const recipients = (rec || []) as { store_id: string; email: string }[];
    if (recipients.length === 0) return json({ error: 'Nenhum destinatário elegível para este público.' }, 400);
    if (recipients.length > MAX_RECIPIENTS) return json({ error: `Limite de ${MAX_RECIPIENTS} destinatários por campanha.` }, 400);

    const { data: camp, error: campErr } = await admin.from('marketing_email_campaigns')
      .insert({ subject, message: text || subject, html, blocks, audience, store_id: audience === 'store' ? storeId : null, status: 'sending', total: recipients.length, created_by: adminId })
      .select('id').single();
    if (campErr || !camp) return json({ error: 'Erro ao criar a campanha: ' + (campErr?.message || '') }, 500);

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100);
      const items = await Promise.all(chunk.map(async (r) => {
        const u = `${url}/functions/v1/email-unsubscribe?s=${r.store_id}&t=${await sign(r.store_id, serviceKey)}`;
        return {
          from, to: [r.email], subject,
          html: finalize(html, u),
          text: `${text}\n\nCancelar inscrição: ${u}`,
          headers: { 'List-Unsubscribe': `<${u}>` },
        };
      }));
      const res = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers, body: JSON.stringify(items) });
      let rows;
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        const ids = (j?.data || []) as { id?: string }[];
        rows = chunk.map((r, n) => ({ campaign_id: camp.id, store_id: r.store_id, email: r.email, status: 'sent', resend_id: ids[n]?.id ?? null }));
        sent += chunk.length;
      } else {
        const err = `HTTP ${res.status} ${(await res.text()).slice(0, 200)}`;
        rows = chunk.map((r) => ({ campaign_id: camp.id, store_id: r.store_id, email: r.email, status: 'failed', error: err }));
        failed += chunk.length;
      }
      await admin.from('marketing_email_sends').insert(rows);
      if (i + 100 < recipients.length) await sleep(600);
    }

    const status = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';
    await admin.from('marketing_email_campaigns').update({ status, sent, failed, finished_at: new Date().toISOString() }).eq('id', camp.id);
    await admin.from('admin_audit_logs').insert({
      admin_id: adminId, action: 'marketing_email_campaign',
      details: { campaign_id: camp.id, subject, audience, total: recipients.length, sent, failed },
    });
    return json({ ok: true, campaign_id: camp.id, total: recipients.length, sent, failed });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});