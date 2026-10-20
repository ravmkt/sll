import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_API_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX"))!;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const asaas = async (path: string, method = "GET", body?: unknown) => {
  const r = await fetch(`${ASAAS_API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "NAO_AUTENTICADO" }, 401);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "NAO_AUTENTICADO" }, 401);

    const { store_id, pack_key } = await req.json().catch(() => ({}));
    if (!store_id || !pack_key) return json({ error: "CAMPOS_OBRIGATORIOS_FALTANTES" }, 400);

    const { data: store } = await admin
      .from("stores").select("id, owner_user_id, contact_name, owner_contact_email").eq("id", store_id).maybeSingle();
    if (!store || store.owner_user_id !== u.user.id) return json({ error: "LOJA_INVALIDA" }, 403);

    const { data: pack } = await admin
      .from("noah_credit_packs").select("id, name, qty, price_cents")
      .eq("key", pack_key).eq("is_active", true).maybeSingle();
    if (!pack || !(pack.price_cents > 0)) return json({ error: "PACOTE_INVALIDO" }, 400);

    // Pedido pendente recente do mesmo pacote e preco: reaproveita o link
    const since = new Date(Date.now() - 2 * 86400_000).toISOString();
    const { data: pend } = await admin
      .from("noah_pack_orders").select("invoice_url")
      .eq("store_id", store_id).eq("pack_id", pack.id).eq("price_cents", pack.price_cents)
      .eq("status", "pending").not("invoice_url", "is", null).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (pend?.invoice_url) return json({ success: true, invoice_url: pend.invoice_url, reused: true });

    // Cliente no Asaas
    let customerId: string | null = null;
    const { data: prev } = await admin
      .from("subscriptions").select("asaas_customer_id")
      .eq("store_id", store_id).not("asaas_customer_id", "is", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    customerId = prev?.asaas_customer_id ?? null;
    if (!customerId) {
      const { data: bi } = await admin.from("billing_info").select("*").eq("store_id", store_id).maybeSingle();
      if (!bi?.cnpj_cpf) {
        return json({ error: "DADOS_FISCAIS_OBRIGATORIOS", message: "Preencha seus dados de faturamento (CPF/CNPJ) antes de comprar." }, 400);
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

    const { data: order, error: oErr } = await admin.from("noah_pack_orders")
      .insert({ store_id, pack_id: pack.id, qty: pack.qty, price_cents: pack.price_cents, status: "pending" })
      .select("id").single();
    if (oErr || !order) return json({ error: "DB_ERROR", details: oErr?.message }, 500);

    const due = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
    const pay = await asaas("/payments", "POST", {
      customer: customerId,
      billingType: "UNDEFINED",
      value: pack.price_cents / 100,
      dueDate: due,
      description: `${pack.name} - SLL Hub`,
      externalReference: `noahpack:${order.id}`,
    });
    if (!pay.ok || !pay.data?.id) {
      await admin.from("noah_pack_orders").delete().eq("id", order.id);
      return json({ error: "ASAAS_PAYMENT_ERROR", details: pay.data }, 400);
    }

    const invoiceUrl: string | null = pay.data.invoiceUrl ?? null;
    const { error: upErr } = await admin.from("noah_pack_orders")
      .update({ asaas_payment_id: pay.data.id, invoice_url: invoiceUrl }).eq("id", order.id);
    if (upErr) {
      await asaas(`/payments/${pay.data.id}`, "DELETE");
      await admin.from("noah_pack_orders").delete().eq("id", order.id);
      return json({ error: "DB_ERROR", details: upErr.message }, 500);
    }

    return json({ success: true, invoice_url: invoiceUrl });
  } catch (err) {
    return json({ error: "UNEXPECTED_ERROR", details: String(err) }, 500);
  }
});