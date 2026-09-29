import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const STATUS_MAP: Record<string, string> = {
  PAYMENT_CONFIRMED: "active",
  PAYMENT_RECEIVED: "active",
  PAYMENT_OVERDUE: "past_due",
  PAYMENT_DELETED: "canceled",
  PAYMENT_REFUNDED: "canceled",
  SUBSCRIPTION_INACTIVATED: "canceled",
  SUBSCRIPTION_DELETED: "canceled",
};

const INVOICE_STATUS_MAP: Record<string, string> = {
  PAYMENT_CONFIRMED: "paid",
  PAYMENT_RECEIVED: "paid",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "canceled",
  PAYMENT_REFUNDED: "refunded",
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const receivedToken = req.headers.get("asaas-access-token");
  if (receivedToken !== WEBHOOK_TOKEN) {
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

  // Idempotência
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
  const newInvoiceStatus = INVOICE_STATUS_MAP[eventType];

  const asaasSubscriptionId: string | undefined =
    body?.payment?.subscription || body?.subscription?.id;
  const asaasCustomerId: string | undefined =
    body?.payment?.customer || body?.subscription?.customer;
  const asaasPaymentId: string | undefined = body?.payment?.id;

  // 1) Atualiza subscriptions por asaas_subscription_id
  let subscriptionUpdated = false;
  if (newSubStatus && asaasSubscriptionId) {
    const { data: sub, error: findError } = await supabase
      .from("subscriptions")
      .select("id, status, store_id")
      .eq("asaas_subscription_id", asaasSubscriptionId)
      .eq("is_current", true)
      .maybeSingle();

    if (findError) console.error("Erro ao buscar subscription:", findError);

    if (sub) {
      subscriptionUpdated = true;
      if (sub.status !== newSubStatus) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({ status: newSubStatus, updated_at: new Date().toISOString() })
          .eq("id", sub.id);

        if (updateError) {
          console.error("Erro ao atualizar subscription:", updateError);
        } else {
          console.log(`[asaas-webhook] Subscription ${sub.id}: ${sub.status} -> ${newSubStatus}`);
        }
      }

      // Sincroniza status na loja também
      if (sub.store_id) {
        await updateStoreStatus(sub.store_id, newSubStatus);
      }
    }
  }

  // 2) Fallback: sem subscription vinculada, tenta por asaas_customer_id direto na store
  if (!subscriptionUpdated && newSubStatus && asaasCustomerId) {
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, subscription_status")
      .eq("asaas_customer_id", asaasCustomerId)
      .maybeSingle();

    if (storeErr) console.error("Erro ao buscar store por customer_id:", storeErr);

    if (store) {
      await updateStoreStatus(store.id, newSubStatus);
    } else {
      console.warn(`[asaas-webhook] Nenhuma store/subscription encontrada para customer=${asaasCustomerId}`);
    }
  }

  // 3) Atualiza invoice correspondente, se existir
  if (newInvoiceStatus && asaasPaymentId) {
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();

    if (invErr) console.error("Erro ao buscar invoice:", invErr);

    if (invoice && invoice.status !== newInvoiceStatus) {
      const { error: updateInvErr } = await supabase
        .from("invoices")
        .update({ status: newInvoiceStatus, updated_at: new Date().toISOString() })
        .eq("id", invoice.id);

      if (updateInvErr) {
        console.error("Erro ao atualizar invoice:", updateInvErr);
      } else {
        console.log(`[asaas-webhook] Invoice ${invoice.id}: ${invoice.status} -> ${newInvoiceStatus}`);
      }
    }
  }

  // Log de auditoria
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

async function updateStoreStatus(storeId: string, newStatus: string) {
  const patch: Record<string, unknown> = {
    subscription_status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "past_due") {
    patch.past_due_since = new Date().toISOString();
  } else if (newStatus === "active") {
    patch.past_due_since = null;
  }

  const { error } = await supabase.from("stores").update(patch).eq("id", storeId);

  if (error) {
    console.error(`Erro ao atualizar store ${storeId}:`, error);
  } else {
    console.log(`[asaas-webhook] Store ${storeId} -> subscription_status=${newStatus}`);
  }
}
