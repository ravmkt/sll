import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const API = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX"))!;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

// Os dados do cartao NUNCA sao gravados nem logados: seguem direto para o Asaas.
Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "NAO_AUTENTICADO" }, 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "NAO_AUTENTICADO" }, 401);

    const body = await req.json().catch(() => ({}));
    const store_id = body?.store_id;
    const c = body?.card ?? {};
    if (!store_id) return json({ error: "STORE_ID_OBRIGATORIO" }, 400);

    const number = digits(c.number);
    const month = digits(c.expiry_month).padStart(2, "0");
    const year = digits(c.expiry_year);
    const ccv = digits(c.ccv);
    const holder = String(c.holder_name ?? "").trim();
    if (number.length < 13 || number.length > 19 || !holder || month.length !== 2 || +month < 1 || +month > 12 ||
        year.length !== 4 || ccv.length < 3 || ccv.length > 4) {
      return json({ error: "CARTAO_INVALIDO", message: "Confira os dados do cart\u00e3o." }, 400);
    }

    const { data: store } = await admin.from("stores").select("id, owner_user_id, owner_contact_email").eq("id", store_id).maybeSingle();
    if (!store || store.owner_user_id !== u.user.id) return json({ error: "LOJA_INVALIDA" }, 403);

    const { data: bi } = await admin.from("billing_info").select("*").eq("store_id", store_id).maybeSingle();
    if (!bi?.cnpj_cpf || !bi?.cep || !bi?.number) {
      return json({ error: "DADOS_FISCAIS_OBRIGATORIOS", message: "Preencha CPF/CNPJ e endere\u00e7o nos dados de faturamento antes de trocar o cart\u00e3o." }, 400);
    }

    const { data: subs } = await admin
      .from("subscriptions")
      .select("id, asaas_subscription_id")
      .eq("store_id", store_id)
      .eq("is_current", true)
      .in("status", ["active", "past_due", "trialing"])
      .not("asaas_subscription_id", "is", null);
    if (!subs || subs.length === 0) return json({ error: "SEM_ASSINATURA_ATIVA" }, 400);

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "127.0.0.1";
    const h = { "Content-Type": "application/json", access_token: KEY };
    const holderInfo = {
      name: bi.legal_name || holder,
      email: bi.email || store.owner_contact_email,
      cpfCnpj: bi.cnpj_cpf,
      postalCode: digits(bi.cep),
      addressNumber: String(bi.number),
      phone: digits(bi.phone) || undefined,
    };
    const fullCard = {
      creditCard: { holderName: holder, number, expiryMonth: month, expiryYear: year, ccv },
      creditCardHolderInfo: holderInfo,
      remoteIp: ip,
    };

    let cardToken: string | null = null;
    let updated = 0;
    const failed: { subscription_id: string; message: string }[] = [];

    for (const s of subs) {
      const id = s.asaas_subscription_id as string;
      const payload = cardToken ? { creditCardToken: cardToken, remoteIp: ip } : fullCard;

      let r = await fetch(`${API}/subscriptions/${id}/creditCard`, { method: "PUT", headers: h, body: JSON.stringify(payload) });
      let b = await r.json().catch(() => ({}));

      if (!r.ok) {
        // Assinatura criada como UNDEFINED: tenta migrar para cartao enviando o cartao na atualizacao
        r = await fetch(`${API}/subscriptions/${id}`, {
          method: "POST",
          headers: h,
          body: JSON.stringify({ billingType: "CREDIT_CARD", ...payload }),
        });
        b = await r.json().catch(() => ({}));
      }

      if (r.ok) {
        updated++;
        cardToken = cardToken ?? b?.creditCard?.creditCardToken ?? b?.creditCardToken ?? null;
      } else {
        failed.push({ subscription_id: s.id, message: b?.errors?.[0]?.description ?? "O Asaas recusou o cart\u00e3o." });
        console.error("update-card falhou", id, r.status);
      }
    }

    if (updated === 0) return json({ error: "ASAAS_CARD_ERROR", message: failed[0]?.message ?? "N\u00e3o foi poss\u00edvel atualizar o cart\u00e3o." }, 400);
    return json({ success: true, updated, failed });
  } catch (e) {
    return json({ error: "UNEXPECTED_ERROR", details: String(e) }, 500);
  }
});