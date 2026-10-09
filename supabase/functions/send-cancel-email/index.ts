import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_FROM = Deno.env.get("MAIL_FROM")!;
const MAIL_ADMIN_COPY = (Deno.env.get("MAIL_ADMIN_COPY") ?? "").trim();
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MODULE_LABEL: Record<string, string> = {
  vidlytics: "Vidlytics",
  live_commerce: "Live Commerce",
  livecommerce: "Live Commerce",
  live: "Live Commerce",
  pdv: "PDV",
};

function html(name: string, item: string) {
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
<img src="${logo}" alt="SLL Hub" width="220" style="display:block;height:auto;border:0;">
</td></tr>
<tr><td style="padding:16px 40px 8px;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0f172a;">Olá, ${first}. Sua assinatura foi cancelada</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
A assinatura de <strong>${esc(item)}</strong> no <strong>SLL Hub</strong> foi cancelada e as próximas cobranças foram interrompidas.
</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
Seus vídeos e configurações continuam guardados. Se quiser voltar, é só assinar novamente pelo painel.
</p>
</td></tr>
<tr><td align="center" style="padding:0 40px 28px;">
<a href="${link}" style="display:inline-block;background:#fd8539;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:12px;">Acessar meu painel</a>
</td></tr>
<tr><td style="padding:0 40px 28px;">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;color:#64748b;">
Não reconhece este cancelamento? Responda este e-mail que vamos ajudar.
</div>
</td></tr>
<tr><td align="center" style="background:#0f172a;padding:18px 24px;font-size:12px;color:#94a3b8;">
SLL Hub · RAV Marketing e Treinamento LTDA · CNPJ 62.894.336/0001-00 · Você recebeu este e-mail porque uma assinatura da sua conta foi cancelada.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";
  const authorized =
    (token !== "" && token === SERVICE_KEY) ||
    (INTERNAL_SECRET !== "" && req.headers.get("x-internal-secret") === INTERNAL_SECRET);
  if (!authorized) return json({ error: "FORBIDDEN" }, 403);

  const { subscription_id } = await req.json().catch(() => ({}));
  if (!subscription_id) return json({ error: "SUBSCRIPTION_ID_OBRIGATORIO" }, 400);

  const { data: sub } = await admin.from("subscriptions").select("*").eq("id", subscription_id).maybeSingle();
  if (!sub) return json({ error: "ASSINATURA_NAO_ENCONTRADA" }, 404);

  const { data: store } = await admin
    .from("stores")
    .select("contact_name, owner_user_id, owner_contact_email")
    .eq("id", sub.store_id)
    .maybeSingle();
  if (!store) return json({ error: "LOJA_NAO_ENCONTRADA" }, 404);

  let planName = "";
  let moduleKey = String(sub.module_key ?? "");
  if (sub.plan_id) {
    const { data: plan } = await admin.from("plans").select("*").eq("id", sub.plan_id).maybeSingle();
    if (plan) {
      planName = String(plan.name ?? "");
      if (!moduleKey) moduleKey = String(plan.module_key ?? "");
    }
  }
  const item = MODULE_LABEL[moduleKey] ?? (planName || "seu plano");

  let to = store.owner_contact_email as string | null;
  if (!to && store.owner_user_id) {
    const { data } = await admin.auth.admin.getUserById(store.owner_user_id);
    to = data?.user?.email ?? null;
  }
  if (!to) return json({ error: "SEM_EMAIL" }, 400);

  const payload: Record<string, unknown> = {
    from: MAIL_FROM,
    to: [to],
    subject: "Sua assinatura do SLL Hub foi cancelada",
    html: html(store.contact_name ?? "", item),
  };
  if (MAIL_ADMIN_COPY && MAIL_ADMIN_COPY.toLowerCase() !== to.toLowerCase()) payload.bcc = [MAIL_ADMIN_COPY];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return json({ error: "RESEND_ERROR", details: await res.text() }, 502);
  return json({ sent: true });
});