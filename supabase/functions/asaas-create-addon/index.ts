import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_API_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX"))!;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const asaas = async (path: string, method = "GET", body?: unknown) => {
  const r = await fetch(`${ASAAS_API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "NAO_AUTENTICADO" }, 401);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "NAO_AUTENTICADO" }, 401);

    const { store_id, addon_key } = await req.json().catch(() => ({}));
    if (!store_id || !addon_key) return json({ error: "CAMPOS_OBRIGATORIOS_FALTANTES" }, 400);

    const { data: store } = await admin
      .from("stores").select("id, owner_user_id, contact_name, owner_contact_email").eq("id", store_id).maybeSingle();
    if (!store || store.owner_user_id !== u.user.id) return json({ error: "LOJA_INVALIDA" }, 403);

    const { data: addon } = await admin
      .from("plan_addons").select("id, name, price_monthly_cents")
      .eq("module_slug", "vidlytics").eq("key", addon_key).eq("is_active", true).maybeSingle();
    if (!addon) return json({ error: "ADDON_INVALIDO" }, 400);

    const { data: base } = await admin
      .from("subscriptions").select("id, asaas_customer_id")
      .eq("store_id", store_id).eq("module_key", "vidlytics").eq("is_current", true)
      .in("status", ["active", "past_due", "lifetime"]).limit(1).maybeSingle();
    if (!base) {
      return json({ error: "SEM_PLANO_BASE", message: "Selecione um plano base primeiro para contratar add-ons." }, 409);
    }

    // Pedido pendente do mesmo pacote: reaproveita o link de pagamento
    const { data: pend } = await admin
      .from("addon_orders").select("invoice_url")
      .eq("subscription_id", base.id).eq("addon_id", addon.id).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (pend?.invoice_url) return json({ success: true, invoice_url: pend.invoice_url, reused: true });

    // Cliente no Asaas
    let customerId = base.asaas_customer_id as string | null;
    if (!customerId) {
      const { data: any } = await admin
        .from("subscriptions").select("asaas_customer_id")
        .eq("store_id", store_id).not("asaas_customer_id", "is", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      customerId = any?.asaas_customer_id ?? null;
    }
    if (!customerId) {
      const { data: bi } = await admin.from("billing_info").select("*").eq("store_id", store_id).maybeSingle();
      if (!bi?.cnpj_cpf) {
        return json({ error: "DADOS_FISCAIS_OBRIGATORIOS", message: "Preencha seus dados de faturamento (CPF/CNPJ) antes de contratar." }, 400);
      }
      const c = await asaas("/customers", "POST", {
        name: bi.legal_name || store.contact_name || "Cliente SLL",
        cpfCnpj: bi.cnpj_cpf,
        email: bi.email || store.owner_contact_email,
        mobilePhone: bi.phone,
        postalCode: bi.cep,
        address: bi.address,
        addressNumber: bi.number,
        complement: bi.complement,
        province: bi.neighborhood,
        externalReference: store_id,
      });
      if (!c.ok) return json({ error: "ASAAS_CUSTOMER_ERROR", details: c.data }, 400);
      customerId = c.data.id;
    }

    // Assinatura mensal separada no Asaas
    const due = new Date();
    due.setDate(due.getDate() + 1);
    const sub = await asaas("/subscriptions", "POST", {
      customer: customerId,
      billingType: "UNDEFINED",
      nextDueDate: due.toISOString().slice(0, 10),
      value: addon.price_monthly_cents / 100,
      cycle: "MONTHLY",
      description: `${addon.name} (add-on Vidlytics) - SLL Hub`,
      externalReference: `addon:${store_id}`,
    });
    if (!sub.ok) return json({ error: "ASAAS_SUBSCRIPTION_ERROR", details: sub.data }, 400);

    let invoiceUrl: string | null = null;
    const pays = await asaas(`/subscriptions/${sub.data.id}/payments`);
    invoiceUrl = pays.data?.data?.[0]?.invoiceUrl ?? null;

    const { error: dbErr } = await admin.from("addon_orders").insert({
      store_id,
      subscription_id: base.id,
      addon_id: addon.id,
      status: "pending",
      asaas_subscription_id: sub.data.id,
      invoice_url: invoiceUrl,
    });
    if (dbErr) {
      await asaas(`/subscriptions/${sub.data.id}`, "DELETE");
      return json({ error: "DB_ERROR", details: dbErr.message }, 500);
    }

    return json({ success: true, invoice_url: invoiceUrl });
  } catch (err) {
    return json({ error: "UNEXPECTED_ERROR", details: String(err) }, 500);
  }
});