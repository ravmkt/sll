import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") ?? "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RequestBody {
  store_id: string;
  plan_id: string;
  customer: {
    name: string;
    cpfCnpj: string;
    email: string;
    mobilePhone?: string;
  };
  billingType: "BOLETO" | "PIX" | "CREDIT_CARD";
  value: number;
  cycle: "MONTHLY" | "YEARLY" | "WEEKLY" | "QUARTERLY" | "SEMIANNUALLY" | "BIWEEKLY";
  nextDueDate: string;
  description?: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const body: RequestBody = await req.json();
    const { store_id, plan_id, customer, billingType, value, cycle, nextDueDate, description } = body;

    if (!store_id || !plan_id || !customer?.cpfCnpj) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 1. Verifica se já existe assinatura ativa com asaas_customer_id
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, asaas_customer_id")
      .eq("store_id", store_id)
      .not("asaas_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let asaasCustomerId = existingSub?.asaas_customer_id;

    // 2. Cria customer no Asaas se ainda não existir
    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: customer.name,
          cpfCnpj: customer.cpfCnpj,
          email: customer.email,
          mobilePhone: customer.mobilePhone,
          externalReference: store_id,
        }),
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        return new Response(JSON.stringify({ error: "Asaas customer error", details: customerData }), { status: 400 });
      }
      asaasCustomerId = customerData.id;
    }

    // 3. Cria a subscription no Asaas
    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType,
        nextDueDate,
        value,
        cycle,
        description: description ?? "Assinatura SLL Hub",
        externalReference: store_id,
      }),
    });

    const subData = await subRes.json();
    if (!subRes.ok) {
      return new Response(JSON.stringify({ error: "Asaas subscription error", details: subData }), { status: 400 });
    }

    // 4. Grava/atualiza em public.subscriptions
    const { data: savedSub, error: dbError } = await supabase
      .from("subscriptions")
      .upsert({
        store_id,
        plan_id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subData.id,
        status: "pending",
        updated_at: new Date().toISOString(),
      }, { onConflict: "store_id" })
      .select()
      .single();

    if (dbError) {
      return new Response(JSON.stringify({ error: "DB error", details: dbError }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, subscription: savedSub, asaas: subData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), { status: 500 });
  }
});
