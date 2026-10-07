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

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RequestBody {
  store_id: string;
  plan_id: string;
  billing_cycle: "MONTHLY" | "SEMIANNUAL" | "YEARLY";
  module_key?: string | null;
  coupon_code?: string | null;
}

const CYCLE_MAP: Record<string, string> = {
  MONTHLY: "MONTHLY",
  SEMIANNUAL: "SEMIANNUALLY",
  YEARLY: "YEARLY",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  let reservedCouponId: string | null = null;
  const release = async () => {
    if (!reservedCouponId) return;
    await supabaseAdmin.rpc("release_coupon", { p_coupon_id: reservedCouponId });
    reservedCouponId = null;
  };
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    // 1. Valida o JWT do usuário autenticado
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return jsonResponse({ error: "NAO_AUTENTICADO" }, 401);
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "NAO_AUTENTICADO" }, 401);
    }

    const body: RequestBody = await req.json();
    const { store_id, plan_id, billing_cycle, module_key, coupon_code } = body;

    if (!store_id || !plan_id || !billing_cycle) {
      return jsonResponse({ error: "CAMPOS_OBRIGATORIOS_FALTANTES" }, 400);
    }

    // 2. Confirma que a loja pertence ao usuário autenticado
    const { data: store, error: storeErr } = await supabaseAdmin
      .from("stores")
      .select("id, owner_user_id, contact_name, owner_contact_email")
      .eq("id", store_id)
      .maybeSingle();

    if (storeErr || !store || store.owner_user_id !== userData.user.id) {
      return jsonResponse({ error: "LOJA_INVALIDA" }, 403);
    }

    // 3. Busca dados fiscais obrigatórios (CPF/CNPJ)
    const { data: billingInfo } = await supabaseAdmin
      .from("billing_info")
      .select("*")
      .eq("store_id", store_id)
      .maybeSingle();

    if (!billingInfo?.cnpj_cpf) {
      return jsonResponse(
        {
          error: "DADOS_FISCAIS_OBRIGATORIOS",
          message: "Preencha seus dados de faturamento (CPF/CNPJ) antes de assinar.",
        },
        400
      );
    }

    // 4. Busca o plano e o preço correto para o ciclo escolhido
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("id, name, price_cents")
      .eq("id", plan_id)
      .maybeSingle();

    if (planErr || !plan) {
      return jsonResponse({ error: "PLANO_INVALIDO" }, 400);
    }

    let priceCents = plan.price_cents;
    const { data: priceRow } = await supabaseAdmin
      .from("plan_prices")
      .select("price_cents")
      .eq("plan_id", plan_id)
      .eq("billing_cycle", billing_cycle.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (priceRow?.price_cents) {
      priceCents = priceRow.price_cents;
    }

    let discountCents = 0;
    if (coupon_code && coupon_code.trim()) {
      const { data: v, error: vErr } = await supabaseAdmin.rpc("validate_coupon", {
        p_code: coupon_code.trim(),
        p_plan_id: plan_id,
      });
      if (vErr || !v?.valid) {
        return jsonResponse({ error: "CUPOM_INVALIDO", reason: v?.reason ?? "erro_validacao" }, 400);
      }
      discountCents =
        v.type === "percentage"
          ? Math.round((priceCents * Number(v.value)) / 100)
          : Number(v.value);
      discountCents = Math.min(Math.max(discountCents, 0), priceCents);
      if (priceCents - discountCents < 500) {
        return jsonResponse(
          { error: "CUPOM_VALOR_MINIMO", message: "O valor final ficaria abaixo do mínimo de R$ 5,00." },
          400
        );
      }
      const { data: redeemed } = await supabaseAdmin.rpc("redeem_coupon", { p_coupon_id: v.coupon_id });
      if (redeemed !== true) {
        return jsonResponse({ error: "CUPOM_INVALIDO", reason: "exhausted" }, 400);
      }
      reservedCouponId = v.coupon_id;
    }

    const value = (priceCents - discountCents) / 100;
    const asaasCycle = CYCLE_MAP[billing_cycle] ?? "MONTHLY";

    // 5. Reaproveita asaas_customer_id se já existir para esta loja
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("asaas_customer_id")
      .eq("store_id", store_id)
      .not("asaas_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let asaasCustomerId = existingSub?.asaas_customer_id;

    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
        body: JSON.stringify({
          name: billingInfo.legal_name || store.contact_name || "Cliente SLL",
          cpfCnpj: billingInfo.cnpj_cpf,
          email: billingInfo.email || store.owner_contact_email,
          mobilePhone: billingInfo.phone,
          postalCode: billingInfo.cep,
          address: billingInfo.address,
          addressNumber: billingInfo.number,
          complement: billingInfo.complement,
          province: billingInfo.neighborhood,
          externalReference: store_id,
        }),
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        await release();
        return jsonResponse({ error: "ASAAS_CUSTOMER_ERROR", details: customerData }, 400);
      }
      asaasCustomerId = customerData.id;
    }

    // 6. Cria a subscription no Asaas
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        nextDueDate: nextDueDate.toISOString().slice(0, 10),
        value,
        cycle: asaasCycle,
        description: `${plan.name}${module_key ? ` (${module_key})` : ""} - SLL Hub`,
        externalReference: store_id,
      }),
    });

    const subData = await subRes.json();
    if (!subRes.ok) {
      await release();
      return jsonResponse({ error: "ASAAS_SUBSCRIPTION_ERROR", details: subData }, 400);
    }

    // 7. Busca o link de pagamento da primeira fatura gerada
    let invoiceUrl: string | null = null;
    try {
      const paymentsRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subData.id}/payments`, {
        headers: { access_token: ASAAS_API_KEY },
      });
      const paymentsData = await paymentsRes.json();
      invoiceUrl = paymentsData?.data?.[0]?.invoiceUrl ?? null;
    } catch (_) {
      // Se falhar, o cliente pode acessar depois via histórico de faturas
    }

    // 8. Grava a assinatura em public.subscriptions (uma linha por módulo/plano)
    const periodEnd = new Date();
    if (billing_cycle === "MONTHLY") periodEnd.setMonth(periodEnd.getMonth() + 1);
    if (billing_cycle === "SEMIANNUAL") periodEnd.setMonth(periodEnd.getMonth() + 6);
    if (billing_cycle === "YEARLY") periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const { data: savedSub, error: dbError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        store_id,
        plan_id,
        module_key: module_key ?? null,
        billing_cycle: billing_cycle.toLowerCase(),
        status: "incomplete",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subData.id,
        billing_provider: "asaas",
        coupon_id: reservedCouponId,
        coupon_discount_cents: discountCents > 0 ? discountCents : null,
        is_current: true,
      })
      .select()
      .single();

    if (dbError) {
      await release();
      return jsonResponse({ error: "DB_ERROR", details: dbError }, 500);
    }

    return jsonResponse({ success: true, subscription: savedSub, invoice_url: invoiceUrl, discount_cents: discountCents });
  } catch (err) {
    await release();
    return jsonResponse({ error: "UNEXPECTED_ERROR", details: String(err) }, 500);
  }
});
