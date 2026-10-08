import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_FROM = Deno.env.get("MAIL_FROM")!;
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function html(name: string) {
  const first = esc((name || "").trim().split(" ")[0] || "tudo bem");
  const logo = `${APP_URL}/assets/sll-logotipo-b.png`;
  const link = `${APP_URL}/dashboard`;
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="height:6px;background:#0094eb;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:28px 32px 8px;">
<img src="${logo}" alt="Sistema Loja Lucrativa" width="220" style="display:block;height:auto;border:0;">
</td></tr>
<tr><td style="padding:16px 40px 8px;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0f172a;">Bem-vindo(a), ${first}! 🎉</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
Seu pagamento foi confirmado e a sua loja já está liberada no <strong>Sistema Loja Lucrativa</strong>.
</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
Entre no painel com o e-mail e a senha que você cadastrou, conecte sua loja e ative os módulos contratados.
</p>
</td></tr>
<tr><td align="center" style="padding:0 40px 28px;">
<a href="${link}" style="display:inline-block;background:#fd8539;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:12px;">Acessar meu painel</a>
</td></tr>
<tr><td style="padding:0 40px 28px;">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;color:#64748b;">
A nota fiscal será enviada ao e-mail cadastrado nos dados de faturamento. Você pode atualizá-los a qualquer momento em <strong>Assinaturas</strong>.
</div>
</td></tr>
<tr><td align="center" style="background:#0f172a;padding:18px 24px;font-size:12px;color:#94a3b8;">
Sistema Loja Lucrativa · Você recebeu este e-mail porque assinou um plano.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  let authorized = token !== "" && token === SERVICE_KEY;
  if (!authorized && token) {
    const chk = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
    });
    authorized = chk.ok;
    if (!chk.ok) console.log("AUTH_CHECK_FAIL", chk.status, token.length, "env_len", SERVICE_KEY.length, SERVICE_KEY.slice(0, 8));
  }
  const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";
  if (!authorized && INTERNAL_SECRET !== "" && req.headers.get("x-internal-secret") === INTERNAL_SECRET) authorized = true;
  if (!authorized) return json({ error: "FORBIDDEN" }, 403);

  const { store_id } = await req.json().catch(() => ({}));
  if (!store_id) return json({ error: "STORE_ID_OBRIGATORIO" }, 400);

  // Reserva o envio de forma atômica: só um disparo por loja
  const { data: claimed } = await admin
    .from("stores")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", store_id)
    .is("welcome_email_sent_at", null)
    .select("id, contact_name, owner_user_id, owner_contact_email")
    .maybeSingle();

  if (!claimed) return json({ skipped: true });

  const revert = () => admin.from("stores").update({ welcome_email_sent_at: null }).eq("id", store_id);

  let to = claimed.owner_contact_email as string | null;
  if (!to && claimed.owner_user_id) {
    const { data } = await admin.auth.admin.getUserById(claimed.owner_user_id);
    to = data?.user?.email ?? null;
  }
  if (!to) { await revert(); return json({ error: "SEM_EMAIL" }, 400); }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [to],
      subject: "Bem-vindo(a) ao Sistema Loja Lucrativa!",
      html: html(claimed.contact_name ?? ""),
    }),
  });

  if (!res.ok) {
    await revert();
    return json({ error: "RESEND_ERROR", details: await res.text() }, 502);
  }
  return json({ sent: true });
});