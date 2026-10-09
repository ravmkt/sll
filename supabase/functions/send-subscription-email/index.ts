import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_FROM = Deno.env.get("MAIL_FROM")!;
const MAIL_ADMIN_COPY = (Deno.env.get("MAIL_ADMIN_COPY") ?? "").trim();
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";

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

const CYCLE_LABEL: Record<string, string> = {
  monthly: "Mensal",
  semiannual: "Semestral",
  yearly: "Anual",
  annual: "Anual",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function html(name: string, item: string, plan: string, cycle: string, value: number | null) {
  const first = esc((name || "").trim().split(" ")[0] || "tudo bem");
  const logo = `${APP_URL}/assets/sll-logotipo-b.png`;
  const link = `${APP_URL}/dashboard`;
  const rows = [
    ["Módulo", esc(item)],
    plan && plan !== item ? ["Plano", esc(plan)] : null,
    cycle ? ["Ciclo", esc(cycle)] : null,
    value ? ["Valor pago", esc(brl(value))] : null,
  ]
    .filter(Boolean)
    .map(
      (r) =>
        `<tr><td style="padding:6px 0;font-size:14px;color:#64748b;">${(r as string[])[0]}</td><td align="right" style="padding:6px 0;font-size:14px;font-weight:bold;color:#0f172a;">${(r as string[])[1]}</td></tr>`,
    )
    .join("");
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
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0f172a;">Pagamento confirmado, ${first}!</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
Sua assinatura de <strong>${esc(item)}</strong> no <strong>SLL Hub</strong> está ativa.
</p>
</td></tr>
<tr><td style="padding:0 40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;">
${rows}
</table>
</td></tr>
<tr><td style="padding:0 40px 8px;">
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
Acesse o painel para começar a usar o módulo.
</p>
</td></tr>
<tr><td align="center" style="padding:0 40px 28px;">
<a href="${link}" style="display:inline-block;background:#fd8539;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:12px;">Acessar meu painel</a>
</td></tr>
<tr><td align="center" style="background:#0f172a;padding:18px 24px;font-size:12px;color:#94a3b8;">
SLL Hub · RAV Marketing e Treinamento LTDA · CNPJ 62.894.336/0001-00 · Você recebeu este e-mail porque uma assinatura da sua conta foi confirmada.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const authorized =
    (token !== "" && token === SERVICE_KEY) ||
    (INTERNAL_SECRET !== "" && req.headers.get("x-internal-secret") === INTERNAL_SECRET);
  if (!authorized) return json({ error: "FORBIDDEN" }, 403);

  const { subscription_id, value } = await req.json().catch(() => ({}));
  if (!subscription_id) return json({ error: "SUBSCRIPTION_ID_OBRIGATORIO" }, 400);

  // Reserva o envio de forma atomica: so a primeira chamada por assinatura passa
  const { data: reserved } = await admin
    .from("subscriptions")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("id", subscription_id)
    .is("confirmation_email_sent_at", null)
    .select("*");
  const sub = reserved?.[0];
  if (!sub) return json({ skipped: true });

  const release = () =>
    admin.from("subscriptions").update({ confirmation_email_sent_at: null }).eq("id", subscription_id);

  const { data: store } = await admin
    .from("stores")
    .select("contact_name, owner_user_id, owner_contact_email")
    .eq("id", sub.store_id)
    .maybeSingle();
  if (!store) { await release(); return json({ error: "LOJA_NAO_ENCONTRADA" }, 404); }

  let planName = "";
  if (sub.dynamic_plan_id) {
    const { data: dp } = await admin.from("dynamic_plans").select("plan_name").eq("id", sub.dynamic_plan_id).maybeSingle();
    planName = String(dp?.plan_name ?? "");
  } else if (sub.plan_id) {
    const { data: p } = await admin.from("plans").select("name").eq("id", sub.plan_id).maybeSingle();
    planName = String(p?.name ?? "");
  }
  const moduleKey = String(sub.module_key ?? "");
  const item = moduleKey && moduleKey !== "bundle" ? (MODULE_LABEL[moduleKey] ?? (planName || moduleKey)) : (planName || "seu plano");
  const cycle = CYCLE_LABEL[String(sub.billing_cycle ?? "").toLowerCase()] ?? "";

  let to = store.owner_contact_email as string | null;
  if (!to && store.owner_user_id) {
    const { data } = await admin.auth.admin.getUserById(store.owner_user_id);
    to = data?.user?.email ?? null;
  }
  if (!to) { await release(); return json({ error: "SEM_EMAIL" }, 400); }

  const payload: Record<string, unknown> = {
    from: MAIL_FROM,
    to: [to],
    subject: `Assinatura confirmada: ${item}`,
    html: html(store.contact_name ?? "", item, planName, cycle, Number(value) > 0 ? Number(value) : null),
  };
  if (MAIL_ADMIN_COPY && MAIL_ADMIN_COPY.toLowerCase() !== to.toLowerCase()) payload.bcc = [MAIL_ADMIN_COPY];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await release();
    return json({ error: "RESEND_ERROR", details: await res.text() }, 502);
  }
  return json({ sent: true });
});