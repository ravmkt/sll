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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validação do token de autenticação enviado pelo Asaas
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

  // Idempotência: verifica se o evento já foi processado
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

  const newStatus = STATUS_MAP[eventType];

  // Identifica o asaas_subscription_id no payload (payment ou subscription)
  const asaasSubscriptionId: string | undefined =
    body?.payment?.subscription || body?.subscription?.id;

  if (newStatus && asaasSubscriptionId) {
    const { data: sub, error: findError } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("asaas_subscription_id", asaasSubscriptionId)
      .eq("is_current", true)
      .maybeSingle();

    if (findError) {
      console.error("Erro ao buscar subscription:", findError);
    }

    if (sub && sub.status !== newStatus) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", sub.id);

      if (updateError) {
        console.error("Erro ao atualizar subscription:", updateError);
      } else {
        console.log(
          `[asaas-webhook] Subscription ${sub.id} atualizada: ${sub.status} -> ${newStatus}`
        );
      }
    } else if (!sub) {
      console.warn(
        `[asaas-webhook] Nenhuma subscription encontrada para asaas_subscription_id=${asaasSubscriptionId}`
      );
    }
  }

  // Log de auditoria (idempotência + histórico)
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
