import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN")!;
const WEBHOOK_TOKEN_SANDBOX = Deno.env.get("ASAAS_WEBHOOK_TOKEN_SANDBOX")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";
const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX")) ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Status da ASSINATURA. O status da loja e recalculado por trigger no banco.
// PAYMENT_DELETED / PAYMENT_REFUNDED afetam so a fatura, nao encerram a assinatura.
const STATUS_MAP: Record<string, string> = {
  PAYMENT_CONFIRMED: "active",
  PAYMENT_RECEIVED: "active",
  PAYMENT_OVERDUE: "past_due",
  SUBSCRIPTION_INACTIVATED: "canceled",
  SUBSCRIPTION_DELETED: "canceled",
};

const INVOICE_STATUS_MAP: Record<string, string> = {
  PAYMENT_CREATED: "pending",
  PAYMENT_RESTORED: "pending",
  PAYMENT_CONFIRMED: "paid",
  PAYMENT_RECEIVED: "paid",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "canceled",
  PAYMENT_REFUNDED: "refunded",
};

type Sub = { id: string; status: string; store_id: string | null; is_current: boolean };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const receivedToken = req.headers.get("asaas-access-token");
  const isValidToken =
    receivedToken === WEBHOOK_TOKEN || receivedToken === WEBHOOK_TOKEN_SANDBOX;

  if (!isValidToken) {
    console.error("Token inválido recebido no webhook Asaas.");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId: string | undefined = body?.id;
  const eventType: string | undefined = body?.event;

  console.log(`[asaas-webhook] Evento recebido: ${eventType} (${eventId})`);

  if (!eventType) {
    return new Response("Missing event type", { status: 400 });
  }

  if (eventId) {
    const { data: existing } = await supabase
      .from("admin_audit_logs")
      .select("id")
      .eq("action", `asaas_webhook:${eventId}`)
      .maybeSingle();

    if (existing) {
      console.log(`[asaas-webhook] Evento ${eventId} já processado. Ignorando.`);
      return new Response("OK (duplicate)", { status: 200 });
    }
  }

  const newSubStatus = STATUS_MAP[eventType];
  const payment = body?.payment;
  const asaasSubscriptionId: string | undefined = payment?.subscription || body?.subscription?.id;
  const asaasPaymentId: string | undefined = payment?.id;

  // 1) Localiza a assinatura (modulo/combo) deste evento
  let sub: Sub | null = null;
  if (asaasSubscriptionId) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, status, store_id, is_current")
      .eq("asaas_subscription_id", asaasSubscriptionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error("Erro ao buscar subscription:", error);
    sub = (data as Sub | null) ?? null;
  } else {
    console.warn(`[asaas-webhook] Evento ${eventType} sem subscription Asaas.`);
  }

  // 2) Atualiza SO a assinatura. 'canceled' e 'lifetime' sao estados finais.
  // Trial vencido sem pagamento nao vira past_due (past_due conta como pago e reabriria o modulo)
  if (sub && newSubStatus && sub.status !== newSubStatus && sub.status !== "canceled" && sub.status !== "lifetime" && !(sub.status === "trialing" && newSubStatus === "past_due")) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: newSubStatus, updated_at: now };
    if (newSubStatus === "canceled") {
      patch.canceled_at = now;
      patch.is_current = false;
    }
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", sub.id);
    if (error) console.error("Erro ao atualizar subscription:", error);
    else console.log(`[asaas-webhook] Subscription ${sub.id}: ${sub.status} -> ${newSubStatus}`);
  }

  // 3) Fatura (cria pendente, marca paga, vencida, cancelada ou estornada)
  await syncInvoice(eventType, payment, sub);

  // 3.5) E-mail de confirmacao: 1 por assinatura (modulo/combo); a funcao ignora se ja enviou
  if ((eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") && sub?.id && sub.status !== "canceled") {
    try {
      const mailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-subscription-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "x-internal-secret": INTERNAL_SECRET, "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: sub.id, value: Number(payment?.value ?? 0) }),
      });
      if (!mailRes.ok) console.error("[asaas-webhook] send-subscription-email falhou:", mailRes.status, await mailRes.text());
    } catch (e) {
      console.error("[asaas-webhook] Erro ao chamar send-subscription-email:", e);
    }
  }
  // 3.7) Beneficio de desconto com validade: conta 1 cobranca por pagamento e volta ao valor cheio no fim
  if ((eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") && sub?.id && asaasSubscriptionId && asaasPaymentId) {
    try {
      const tickKey = `benefit_tick:${asaasPaymentId}`;
      const { data: done } = await supabase.from("admin_audit_logs").select("id").eq("action", tickKey).maybeSingle();
      if (!done) {
        const { data: bs } = await supabase
          .from("subscriptions")
          .select("benefit_months_left, benefit_full_value_cents")
          .eq("id", sub.id)
          .maybeSingle();
        const left = bs?.benefit_months_left;
        if (typeof left === "number" && left > 0) {
          await supabase.from("admin_audit_logs").insert({ action: tickKey, details: { subscription_id: sub.id, left_before: left } });
          const newLeft = left - 1;
          await supabase.from("subscriptions").update({ benefit_months_left: newLeft, updated_at: new Date().toISOString() }).eq("id", sub.id);
          if (newLeft === 0 && bs?.benefit_full_value_cents && ASAAS_KEY) {
            const r = await fetch(`${ASAAS_URL}/subscriptions/${asaasSubscriptionId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
              body: JSON.stringify({ value: bs.benefit_full_value_cents / 100, updatePendingPayments: true }),
            });
            const rb = await r.text();
            console.log("[asaas-webhook] valor cheio restaurado", sub.id, r.status);
            if (!r.ok) {
              console.error("[asaas-webhook] falha ao restaurar valor cheio:", rb);
              await supabase.from("admin_audit_logs").insert({ action: `benefit_revert_failed:${sub.id}`, details: { status: r.status, body: rb } });
            }
          }
        }
      }
    } catch (e) {
      console.error("[asaas-webhook] erro no beneficio de desconto:", e);
    }
  }

  // 4) Comissao de indicacao
  if ((eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") && asaasPaymentId && sub) {
    const paidValue = Number(payment?.value ?? 0);
    if (paidValue > 0) {
      const period = String(payment?.dueDate ?? new Date().toISOString()).slice(0, 7);
      const { error: refErr } = await supabase.rpc("record_referral_commission", {
        p_subscription_id: sub.id,
        p_payment_id: asaasPaymentId,
        p_value: paidValue,
        p_period: period,
      });
      if (refErr) console.error("Erro ao registrar comissao:", refErr);
    }
  }
  if ((eventType === "PAYMENT_REFUNDED" || eventType === "PAYMENT_DELETED") && asaasPaymentId) {
    const { error: cancelRefErr } = await supabase.rpc("cancel_referral_reward_by_payment", {
      p_payment_id: asaasPaymentId,
    });
    if (cancelRefErr) console.error("Erro ao cancelar comissao:", cancelRefErr);
  }

  if ((eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") && body?.payment?.subscription) {
    const { error: addonErr } = await supabase.rpc("activate_addon_order", {
      p_asaas_subscription_id: body.payment.subscription,
    });
    if (addonErr) console.error("Erro ao ativar add-on:", addonErr);
  }
  if ((eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") && body?.payment?.subscription) {
    const { error: pendErr } = await supabase.rpc("activate_pending_addons", {
      p_asaas_subscription_id: body.payment.subscription,
    });
    if (pendErr) console.error("Erro ao ativar add-ons do checkout:", pendErr);
  }
  try {
    await supabase.from("admin_audit_logs").insert({
      action: `asaas_webhook:${eventId ?? "no-id"}`,
      details: { event: eventType, payload: body },
    });
  } catch (e) {
    console.error("Erro ao gravar audit log:", e);
  }

  return new Response("OK", { status: 200 });
});

async function syncInvoice(eventType: string, payment: any, sub: Sub | null) {
  const target = INVOICE_STATUS_MAP[eventType];
  const paymentId: string | undefined = payment?.id;
  if (!target || !paymentId) return;

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();
  if (invErr) {
    console.error("Erro ao buscar invoice:", invErr);
    return;
  }

  const now = new Date().toISOString();

  if (inv) {
    if (inv.status === target || inv.status === "refunded") return;
    // evento atrasado/fora de ordem nao desfaz uma fatura ja paga
    if (inv.status === "paid" && target !== "refunded") return;
    const patch: Record<string, unknown> = { status: target, updated_at: now };
    if (target === "paid") patch.paid_at = now;
    const { error } = await supabase.from("invoices").update(patch).eq("id", inv.id);
    if (error) console.error("Erro ao atualizar invoice:", error);
    else console.log(`[asaas-webhook] Invoice ${inv.id}: ${inv.status} -> ${target}`);
    return;
  }

  if (!sub?.store_id) return;
  const value = Number(payment?.value ?? 0);
  if (!(value > 0)) return;

  const { error } = await supabase.from("invoices").insert({
    store_id: sub.store_id,
    subscription_id: sub.id,
    amount_cents: Math.round(value * 100),
    currency: "BRL",
    status: target,
    description: `Pagamento Asaas - ${paymentId}`,
    gateway_provider: "asaas",
    asaas_payment_id: paymentId,
    due_date: payment?.dueDate ?? null,
    invoice_url: payment?.invoiceUrl ?? null,
    payment_method: payment?.billingType ?? null,
    paid_at: target === "paid" ? now : null,
  });
  if (error) console.error("Erro ao criar invoice:", error);
}