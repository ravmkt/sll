import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_ENV = Deno.env.get("ASAAS_ENV") ?? "sandbox";
const IS_PROD = ASAAS_ENV === "production";
const ASAAS_API_URL = IS_PROD
  ? "https://api.asaas.com/v3"
  : "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = (IS_PROD
  ? Deno.env.get("ASAAS_API_KEY")
  : Deno.env.get("ASAAS_API_KEY_SANDBOX"))!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GUARANTEE_DAYS = 14;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isSuperadmin(user: { id: string; app_metadata?: Record<string, unknown> }) {
  if (user.app_metadata?.is_superadmin === true) return true;
  const { data, error } = await supabaseAdmin
    .from("admin_superusers")
    .select("*")
    .eq("user_id", user.id)
    .limit(1);
  return !error && !!data && data.length > 0;
}

const when = (p: any) => String(p.confirmedDate ?? p.paymentDate ?? p.dateCreated ?? "");

// Ultima cobranca paga (CONFIRMED ou RECEIVED) da assinatura
async function findLastPaid(h: Record<string, string>, asaasId: string) {
  const all: any[] = [];
  for (const st of ["CONFIRMED", "RECEIVED"]) {
    const r = await fetch(`${ASAAS_API_URL}/payments?subscription=${asaasId}&status=${st}&limit=100`, { headers: h });
    const b = await r.json().catch(() => ({}));
    all.push(...(b?.data ?? []));
  }
  all.sort((a, b) => when(b).localeCompare(when(a)));
  return all[0] ?? null;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return jsonResponse({ error: "NAO_AUTENTICADO" }, 401);
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "NAO_AUTENTICADO" }, 401);
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const subscription_id = body?.subscription_id;
    const wantsRefund = body?.refund === true;
    const preview = body?.preview === true;
    if (!subscription_id) {
      return jsonResponse({ error: "SUBSCRIPTION_ID_OBRIGATORIO" }, 400);
    }

    // 1. Busca a assinatura e confirma permissão (dono da loja ou superadmin)
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id, store_id, asaas_subscription_id, status, is_current, created_at, stores!inner(owner_user_id)")
      .eq("id", subscription_id)
      .maybeSingle();

    if (subErr || !sub) {
      return jsonResponse({ error: "ASSINATURA_NAO_ENCONTRADA" }, 404);
    }

    const store = sub.stores as unknown as { owner_user_id: string };
    const superadmin = await isSuperadmin(user);
    if (store.owner_user_id !== user.id && !superadmin) {
      return jsonResponse({ error: "NAO_AUTORIZADO" }, 403);
    }
    // Estorno e consulta de garantia: somente o Master
    if ((wantsRefund || preview) && !superadmin) {
      return jsonResponse({ error: "SOMENTE_MASTER" }, 403);
    }

    const h = { access_token: ASAAS_API_KEY, "Content-Type": "application/json" };
    const asaasId = sub.asaas_subscription_id as string | null;
    const days = Math.max(0, Math.floor((Date.now() - Date.parse(sub.created_at)) / 86400000));
    const alreadyCanceled = sub.status === "canceled" && !sub.is_current;

    // Consulta para o modal do Master
    if (preview) {
      const last = asaasId ? await findLastPaid(h, asaasId) : null;
      return jsonResponse({
        created_at: sub.created_at,
        days,
        guarantee_days: GUARANTEE_DAYS,
        within_guarantee: days <= GUARANTEE_DAYS,
        already_canceled: alreadyCanceled,
        last_payment: last
          ? {
              id: last.id,
              value: Number(last.value ?? 0),
              date: last.paymentDate ?? last.confirmedDate ?? last.dateCreated ?? null,
              billing_type: last.billingType ?? null,
            }
          : null,
      });
    }

    if (alreadyCanceled && !wantsRefund) {
      return jsonResponse({ success: true, message: "Assinatura já estava cancelada." });
    }

    // 2. Cancela no Asaas e no banco (pula se ja estava cancelada e so falta estornar)
    let paymentsRemoved = 0;
    const paymentErrors: unknown[] = [];

    if (!alreadyCanceled) {
      if (asaasId) {
        const asaasRes = await fetch(`${ASAAS_API_URL}/subscriptions/${asaasId}`, { method: "DELETE", headers: h });
        const asaasBody = await asaasRes.json().catch(() => ({}));
        console.log("asaas delete subscription", asaasId, asaasRes.status, JSON.stringify(asaasBody));
        if (!asaasRes.ok && asaasRes.status !== 404) {
          return jsonResponse({ error: "ASAAS_CANCEL_ERROR", details: asaasBody }, 400);
        }

        for (const st of ["PENDING", "OVERDUE"]) {
          const listRes = await fetch(`${ASAAS_API_URL}/payments?subscription=${asaasId}&status=${st}&limit=100`, { headers: h });
          const list = await listRes.json().catch(() => ({}));
          for (const p of (list?.data ?? []) as { id: string }[]) {
            const r = await fetch(`${ASAAS_API_URL}/payments/${p.id}`, { method: "DELETE", headers: h });
            const rb = await r.json().catch(() => ({}));
            console.log("asaas delete payment", p.id, r.status, JSON.stringify(rb));
            if (r.ok) paymentsRemoved++; else paymentErrors.push(rb);
          }
        }
      }

      const { error: updateErr } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          cancel_at_period_end: false,
          is_current: false,
        })
        .eq("id", subscription_id);

      if (updateErr) {
        return jsonResponse({ error: "DB_ERROR", details: updateErr }, 500);
      }
    }

    // 3. Estorno integral da ultima cobranca paga (so Master, so se solicitado)
    let refunded: { payment_id: string; value: number } | null = null;
    let refundError: string | null = null;
    if (wantsRefund) {
      if (!asaasId) {
        refundError = "Assinatura sem cobrança no Asaas.";
      } else {
        const last = await findLastPaid(h, asaasId);
        if (!last) {
          refundError = "Nenhuma cobrança paga encontrada para estornar.";
        } else {
          const r = await fetch(`${ASAAS_API_URL}/payments/${last.id}/refund`, {
            method: "POST",
            headers: h,
            body: JSON.stringify({ description: `Estorno integral - garantia de ${GUARANTEE_DAYS} dias (Master)` }),
          });
          const rb = await r.json().catch(() => ({}));
          console.log("asaas refund", last.id, r.status, JSON.stringify(rb));
          if (r.ok) {
            refunded = { payment_id: last.id, value: Number(last.value ?? 0) };
            try {
              await supabaseAdmin.from("admin_audit_logs").insert({
                admin_id: user.id,
                action: "subscription_refunded",
                details: {
                  store_id: sub.store_id,
                  subscription_id,
                  payment_id: last.id,
                  value: refunded.value,
                  days_since_signup: days,
                  within_guarantee: days <= GUARANTEE_DAYS,
                },
              });
            } catch (e) {
              console.error("audit refund falhou", e);
            }
          } else {
            refundError = rb?.errors?.[0]?.description ?? "O Asaas recusou o estorno.";
          }
        }
      }
    }

    // 4. E-mail de cancelamento (nao bloqueia o cancelamento)
    if (!alreadyCanceled) {
      try {
        const mailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-cancel-email`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ subscription_id }),
        });
        console.log("send-cancel-email", mailRes.status, await mailRes.text());
      } catch (e) {
        console.error("send-cancel-email falhou", e);
      }
    }

    return jsonResponse({
      success: true,
      payments_removed: paymentsRemoved,
      payment_errors: paymentErrors,
      refunded,
      refund_error: refundError,
    });
  } catch (err) {
    return jsonResponse({ error: "UNEXPECTED_ERROR", details: String(err) }, 500);
  }
});