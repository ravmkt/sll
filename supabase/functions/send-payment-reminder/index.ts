import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_FROM = Deno.env.get("MAIL_FROM")!;
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

const MAX_REMINDERS = 2;
const FIRST_AFTER_DAYS = 1;
const SECOND_AFTER_DAYS = 4;
const MIN_GAP_DAYS = 2;
const MAX_AGE_DAYS = 10;

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dmy = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const sp = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

function html(name: string, item: string, amount: string, due: string, link: string, last: boolean) {
  const first = esc((name || "").trim().split(" ")[0] || "tudo bem");
  const logo = `${APP_URL}/assets/sll-logotipo-b.png`;
  const title = last ? `${first}, último aviso sobre o seu pagamento` : `Olá, ${first}. Falta só o pagamento`;
  const intro = last
    ? `A cobrança de <strong>${esc(item)}</strong> (${esc(amount)}, vencida em ${esc(due)}) continua em aberto. Para não perder o acesso ao módulo, conclua o pagamento o quanto antes.`
    : `A cobrança de <strong>${esc(item)}</strong> no <strong>SLL Hub</strong> (${esc(amount)}, vencida em ${esc(due)}) ainda não foi paga. Falta só esse passo para liberar tudo.`;
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
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0f172a;">${title}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>
</td></tr>
<tr><td align="center" style="padding:0 40px 28px;">
<a href="${link}" style="display:inline-block;background:#fd8539;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:12px;">Pagar agora</a>
</td></tr>
<tr><td style="padding:0 40px 28px;">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;color:#64748b;">
Se você já pagou, desconsidere este e-mail. Precisa de ajuda? Responda esta mensagem.
</div>
</td></tr>
<tr><td align="center" style="background:#0f172a;padding:18px 24px;font-size:12px;color:#94a3b8;">
SLL Hub · RAV Marketing e Treinamento LTDA · CNPJ 62.894.336/0001-00 · Você recebeu este e-mail porque há uma cobrança em aberto na sua conta.
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

  const { dry_run } = await req.json().catch(() => ({}));

  const now = new Date();
  const today = sp(now);
  const minDue = sp(new Date(now.getTime() - MAX_AGE_DAYS * 86400000));

  const { data: invs, error } = await admin
    .from("invoices")
    .select("id, store_id, subscription_id, amount_cents, due_date, invoice_url, reminder_count, last_reminder_at")
    .in("status", ["pending", "overdue"])
    .lt("due_date", today)
    .gte("due_date", minDue)
    .lt("reminder_count", MAX_REMINDERS);
  if (error) return json({ error: "DB_ERROR", details: error.message }, 500);

  const result: Record<string, unknown>[] = [];

  for (const inv of invs ?? []) {
    const dueStr = String(inv.due_date).slice(0, 10);
    const overdue = Math.floor((Date.parse(today) - Date.parse(dueStr)) / 86400000);
    const count = Number(inv.reminder_count ?? 0);

    const eligible =
      (count === 0 && overdue >= FIRST_AFTER_DAYS) ||
      (count === 1 &&
        overdue >= SECOND_AFTER_DAYS &&
        (!inv.last_reminder_at || now.getTime() - Date.parse(inv.last_reminder_at) >= MIN_GAP_DAYS * 86400000));
    if (!eligible || !inv.subscription_id) continue;

    const { data: sub } = await admin
      .from("subscriptions").select("*").eq("id", inv.subscription_id).maybeSingle();
    if (!sub || !sub.is_current || sub.status === "canceled" || sub.status === "lifetime") continue;

    const { data: store } = await admin
      .from("stores").select("contact_name, owner_user_id, owner_contact_email").eq("id", inv.store_id).maybeSingle();
    if (!store) continue;

    let to = store.owner_contact_email as string | null;
    if (!to && store.owner_user_id) {
      const { data } = await admin.auth.admin.getUserById(store.owner_user_id);
      to = data?.user?.email ?? null;
    }
    if (!to) { result.push({ invoice: inv.id, skipped: "SEM_EMAIL" }); continue; }

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

    if (dry_run) { result.push({ invoice: inv.id, to, item, overdue_days: overdue, next: count + 1 }); continue; }

    // Reserva o envio de forma atomica (evita duplicidade se o cron rodar duas vezes)
    const { data: claimed } = await admin
      .from("invoices")
      .update({ reminder_count: count + 1, last_reminder_at: now.toISOString() })
      .eq("id", inv.id)
      .eq("reminder_count", count)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const isLast = count + 1 >= MAX_REMINDERS;
    const link = inv.invoice_url || `${APP_URL}/dashboard`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [to],
        subject: isLast ? `Último aviso: pagamento de ${item} em aberto` : `Lembrete: pagamento de ${item} em aberto`,
        html: html(store.contact_name ?? "", item, brl(Number(inv.amount_cents ?? 0)), dmy(dueStr), link, isLast),
      }),
    });

    if (!res.ok) {
      await admin.from("invoices")
        .update({ reminder_count: count, last_reminder_at: inv.last_reminder_at })
        .eq("id", inv.id);
      result.push({ invoice: inv.id, error: "RESEND_ERROR", details: await res.text() });
      continue;
    }
    result.push({ invoice: inv.id, to, item, sent: count + 1 });
  }

  console.log("send-payment-reminder", JSON.stringify(result));
  return json({ dry_run: !!dry_run, processed: result.length, result });
});