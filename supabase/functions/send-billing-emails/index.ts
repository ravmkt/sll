import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_FROM = Deno.env.get("MAIL_FROM")!;
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const DAY = 86400000;

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

const METHOD_LABEL: Record<string, string> = {
  BOLETO: "Boleto",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  UNDEFINED: "Pix, boleto ou cartão",
};

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dmy = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const sp = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Kind = "checkout_1h" | "checkout_24h" | "inv_d_minus3" | "inv_d0" | "inv_d_plus1" | "inv_d_plus3";
type Ctx = {
  first: string; item: string; amount: string | null; due: string | null;
  method: string | null; link: string; days: number; pauseDate: string; paused: boolean;
};
type Content = { subject: string; title: string; intro: string; cta: string; urgent: boolean };

function content(kind: Kind, c: Ctx): Content {
  const item = esc(c.item);
  const first = esc(c.first);
  const due = esc(c.due ?? "");
  const pause = esc(c.pauseDate);
  const inDays = c.days === 1 ? "1 dia" : `${c.days} dias`;
  switch (kind) {
    case "checkout_1h":
      return {
        subject: `Falta pouco para ativar o ${c.item}`,
        title: `${first}, falta só o pagamento`,
        intro: `Você começou a assinar <strong>${item}</strong> no <strong>SLL Hub</strong>, mas o pagamento ainda não foi concluído. Finalize agora para liberar o acesso.`,
        cta: "Finalizar assinatura", urgent: false,
      };
    case "checkout_24h":
      return {
        subject: `Último lembrete: finalize sua assinatura do ${c.item}`,
        title: `Último lembrete, ${first}`,
        intro: `Sua assinatura de <strong>${item}</strong> ainda não foi concluída. Este é o nosso último lembrete sobre esse pedido. Se ainda quiser ativar o módulo, é só finalizar o pagamento.`,
        cta: "Finalizar assinatura", urgent: true,
      };
    case "inv_d_minus3":
      return {
        subject: `Sua fatura do ${c.item} vence em ${inDays}`,
        title: `${first}, sua fatura vence em breve`,
        intro: `A fatura da assinatura de <strong>${item}</strong> vence em <strong>${due}</strong>. Pague até lá para manter o acesso sem interrupções.`,
        cta: "Pagar fatura", urgent: false,
      };
    case "inv_d0":
      return {
        subject: `Sua fatura do ${c.item} vence hoje`,
        title: `${first}, sua fatura vence hoje`,
        intro: `A fatura da assinatura de <strong>${item}</strong> vence <strong>hoje (${due})</strong>. Pague hoje para evitar atraso.`,
        cta: "Pagar fatura", urgent: false,
      };
    case "inv_d_plus1":
      return {
        subject: `Fatura em atraso: ${c.item}`,
        title: `${first}, sua fatura está em atraso`,
        intro: `A fatura de <strong>${item}</strong> venceu em <strong>${due}</strong> e ainda não foi paga. Seu acesso continua liberado até <strong>${pause}</strong>. Depois dessa data, o módulo é pausado até o pagamento.`,
        cta: "Pagar agora", urgent: true,
      };
    case "inv_d_plus3":
      return c.paused
        ? {
            subject: `Acesso pausado: ${c.item}`,
            title: `${first}, seu acesso foi pausado`,
            intro: `A fatura de <strong>${item}</strong> (vencida em ${due}) continua em aberto e o acesso ao módulo foi pausado. Assim que o pagamento for confirmado, o acesso volta.`,
            cta: "Pagar e reativar", urgent: true,
          }
        : {
            subject: `Último aviso: ${c.item} será pausado`,
            title: `${first}, último aviso`,
            intro: `A fatura de <strong>${item}</strong> (vencida em ${due}) continua em aberto. Sem o pagamento, o acesso será pausado em <strong>${pause}</strong>.`,
            cta: "Pagar agora", urgent: true,
          };
  }
}

function layout(c: Ctx, ct: Content) {
  const logo = `${APP_URL}/assets/sll-logotipo-b.png`;
  const list = [
    ["Módulo", c.item],
    c.amount ? ["Valor", c.amount] : null,
    c.due ? ["Vencimento", c.due] : null,
    c.method ? ["Forma de pagamento", c.method] : null,
  ].filter((r): r is string[] => !!r);
  const rows = list
    .map((r) => `<tr><td style="padding:6px 0;font-size:14px;color:#64748b;">${esc(r[0])}</td><td align="right" style="padding:6px 0;font-size:14px;font-weight:bold;color:#0f172a;">${esc(r[1])}</td></tr>`)
    .join("");
  const bar = ct.urgent ? "#f43f5e" : "#0094eb";
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="height:6px;background:${bar};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:28px 32px 8px;">
<img src="${logo}" alt="SLL Hub" width="220" style="display:block;height:auto;border:0;">
</td></tr>
<tr><td style="padding:16px 40px 8px;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0f172a;">${ct.title}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">${ct.intro}</p>
</td></tr>
<tr><td style="padding:0 40px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;">
${rows}
</table>
</td></tr>
<tr><td align="center" style="padding:0 40px 28px;">
<a href="${c.link}" style="display:inline-block;background:#fd8539;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:12px;">${esc(ct.cta)}</a>
</td></tr>
<tr><td style="padding:0 40px 28px;">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;color:#64748b;">
Se você já pagou, desconsidere este e-mail. Precisa de ajuda? Responda esta mensagem.
</div>
</td></tr>
<tr><td align="center" style="background:#0f172a;padding:18px 24px;font-size:12px;color:#94a3b8;">
SLL Hub · RAV Marketing e Treinamento LTDA · CNPJ 62.894.336/0001-00 · Você recebeu este e-mail porque há uma assinatura ou cobrança pendente na sua conta.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function recipient(storeId: string): Promise<{ to: string; name: string } | null> {
  const { data: st } = await admin
    .from("stores").select("contact_name, owner_user_id, owner_contact_email").eq("id", storeId).maybeSingle();
  if (!st) return null;
  let to = st.owner_contact_email as string | null;
  if (!to && st.owner_user_id) {
    const { data } = await admin.auth.admin.getUserById(st.owner_user_id);
    to = data?.user?.email ?? null;
  }
  return to ? { to, name: String(st.contact_name ?? "") } : null;
}

async function itemOf(sub: any): Promise<string> {
  const mk = String(sub.module_key ?? "");
  if (mk && mk !== "bundle" && MODULE_LABEL[mk]) return MODULE_LABEL[mk];
  let plan = "";
  if (sub.dynamic_plan_id) {
    const { data } = await admin.from("dynamic_plans").select("plan_name").eq("id", sub.dynamic_plan_id).maybeSingle();
    plan = String(data?.plan_name ?? "");
  } else if (sub.plan_id) {
    const { data } = await admin.from("plans").select("name").eq("id", sub.plan_id).maybeSingle();
    plan = String(data?.name ?? "");
  }
  return plan || (mk && mk !== "bundle" ? mk : "seu plano");
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
  const dry = !!dry_run;

  const now = new Date();
  const today = sp(now);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(now));
  const quiet = hour < 8 || hour >= 20;

  const { data: g } = await admin.rpc("billing_grace_days");
  const grace = Number(g ?? 3);

  const out: Record<string, unknown>[] = [];

  const already = async (kind: Kind, ref: string) => {
    const { data } = await admin.from("email_events").select("id").eq("kind", kind).eq("ref_id", ref).maybeSingle();
    return !!data;
  };
  const claim = async (kind: Kind, ref: string) => {
    const { error } = await admin.from("email_events").insert({ kind, ref_id: ref });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw new Error(error.message);
  };
  const unclaim = (kind: Kind, ref: string) =>
    admin.from("email_events").delete().eq("kind", kind).eq("ref_id", ref);

  const deliver = async (kind: Kind, ref: string, rc: { to: string; name: string }, base: Omit<Ctx, "first">) => {
    if (await already(kind, ref)) return;
    if (dry) { out.push({ kind, ref, to: rc.to, dry_run: true }); return; }
    if (!(await claim(kind, ref))) return;
    const c: Ctx = { ...base, first: (rc.name || "").trim().split(" ")[0] || "tudo bem" };
    const ct = content(kind, c);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM, to: [rc.to], subject: ct.subject, html: layout(c, ct) }),
    });
    if (!res.ok) {
      await unclaim(kind, ref);
      out.push({ kind, ref, error: "RESEND_ERROR", details: await res.text() });
      return;
    }
    out.push({ kind, ref, to: rc.to, sent: true });
    await sleep(600);
  };

  // ===== Fluxo 1: checkout abandonado (assinatura 'incomplete') =====
  const { data: pend } = await admin
    .from("subscriptions").select("*")
    .eq("status", "incomplete")
    .gte("created_at", new Date(now.getTime() - 48 * 3600000).toISOString());

  const groups = new Map<string, any[]>();
  for (const s of pend ?? []) {
    const k = `${s.store_id}|${s.dynamic_plan_id ?? s.plan_id ?? ""}|${s.module_key ?? ""}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const heads: any[] = [];
  const sibIds = new Map<string, string[]>();
  for (const list of groups.values()) {
    list.sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at));
    if (!list[0].is_current) continue;
    heads.push(list[0]);
    sibIds.set(list[0].id, list.slice(1).map((x) => x.id));
  }

  for (const sub of heads) {
    const olds = sibIds.get(sub.id) ?? [];
    const ageH = (now.getTime() - Date.parse(sub.created_at)) / 3600000;
    const kind: Kind | null = ageH >= 24 ? "checkout_24h" : ageH >= 1 ? "checkout_1h" : null;
    if (kind && olds.length) {
      const { data: prev } = await admin.from("email_events").select("id").eq("kind", kind).in("ref_id", olds).limit(1);
      if (prev?.length) continue;
    }
    if (!kind) continue;

    const mk = String(sub.module_key ?? "");
    if (mk && mk !== "bundle") {
      const { data: paid } = await admin.from("subscriptions").select("id")
        .eq("store_id", sub.store_id).eq("module_key", mk)
        .in("status", ["active", "trialing", "past_due", "lifetime"]).limit(1);
      if (paid?.length) continue;
    }

    const rc = await recipient(sub.store_id);
    if (!rc) { out.push({ subscription: sub.id, skipped: "SEM_EMAIL" }); continue; }

    const { data: inv } = await admin.from("invoices")
      .select("amount_cents, due_date, invoice_url, payment_method")
      .eq("subscription_id", sub.id).in("status", ["pending", "overdue"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    await deliver(kind, sub.id, rc, {
      item: await itemOf(sub),
      amount: inv?.amount_cents ? brl(Number(inv.amount_cents)) : null,
      due: inv?.due_date ? dmy(String(inv.due_date)) : null,
      method: inv?.payment_method ? (METHOD_LABEL[String(inv.payment_method)] ?? null) : null,
      link: inv?.invoice_url || `${APP_URL}/dashboard`,
      days: 0, pauseDate: "", paused: false,
    });
  }

  // ===== Fluxo 2: faturas da assinatura corrente (so entre 8h e 20h) =====
  if (!quiet) {
    const lo = sp(new Date(now.getTime() - 5 * DAY));
    const hi = sp(new Date(now.getTime() + 3 * DAY));
    const { data: invs, error } = await admin.from("invoices")
      .select("id, store_id, subscription_id, amount_cents, due_date, invoice_url, payment_method")
      .in("status", ["pending", "overdue"]).gte("due_date", lo).lte("due_date", hi);
    if (error) return json({ error: "DB_ERROR", details: error.message }, 500);

    for (const inv of invs ?? []) {
      if (!inv.subscription_id || !inv.due_date) continue;
      const dueStr = String(inv.due_date).slice(0, 10);
      const toDue = Math.round((Date.parse(dueStr) - Date.parse(today)) / DAY);
      const kind: Kind | null =
        toDue >= 1 && toDue <= 3 ? "inv_d_minus3"
        : toDue === 0 ? "inv_d0"
        : toDue >= -2 && toDue <= -1 ? "inv_d_plus1"
        : toDue <= -3 ? "inv_d_plus3"
        : null;
      if (!kind) continue;

      const { data: sub } = await admin.from("subscriptions").select("*").eq("id", inv.subscription_id).maybeSingle();
      if (!sub || !sub.is_current || !["active", "past_due"].includes(sub.status)) continue;

      const rc = await recipient(inv.store_id);
      if (!rc) { out.push({ invoice: inv.id, skipped: "SEM_EMAIL" }); continue; }

      const pauseAt = sub.past_due_since
        ? Date.parse(sub.past_due_since) + grace * DAY
        : Date.parse(dueStr) + (1 + grace) * DAY;

      await deliver(kind, inv.id, rc, {
        item: await itemOf(sub),
        amount: brl(Number(inv.amount_cents ?? 0)),
        due: dmy(dueStr),
        method: inv.payment_method ? (METHOD_LABEL[String(inv.payment_method)] ?? null) : null,
        link: inv.invoice_url || `${APP_URL}/dashboard`,
        days: Math.max(toDue, 0),
        pauseDate: dmy(sp(new Date(pauseAt))),
        paused: pauseAt <= now.getTime(),
      });
    }
  }

  console.log("send-billing-emails", JSON.stringify({ dry, quiet, out }));
  return json({ dry_run: dry, quiet_hours: quiet, processed: out.length, result: out });
});