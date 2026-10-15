import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX")) ?? "";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const MONTHS: Record<string, number> = { MONTHLY: 1, SEMIANNUAL: 6, YEARLY: 12 };
const ASAAS_CYCLE: Record<string, string> = { MONTHLY: "MONTHLY", SEMIANNUAL: "SEMIANNUALLY", YEARLY: "YEARLY" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function asaas(path: string, method = "GET", body?: unknown) {
  const r = await fetch(`${ASAAS_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) as any };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
    if (!ASAAS_KEY) return json({ error: "GATEWAY_NAO_CONFIGURADO" }, 500);

    // 1) Autenticacao
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!token || !u?.user) return json({ error: "NAO_AUTENTICADO" }, 401);

    const b = await req.json().catch(() => ({}));
    const store_id = String(b.store_id ?? "");
    const plan_id = String(b.plan_id ?? "");
    const cycle = String(b.billing_cycle ?? "").toUpperCase();
    const method = String(b.method ?? "").toUpperCase();
    const addonIds: string[] = Array.from(new Set((Array.isArray(b.selected_addon_ids) ? b.selected_addon_ids : []).filter((x: unknown) => typeof x === "string")));
    const p = b.payer ?? {};
    const c = b.card ?? {};

    if (!store_id || !plan_id || !MONTHS[cycle] || !["CREDIT_CARD", "PIX"].includes(method)) {
      return json({ error: "CAMPOS_OBRIGATORIOS_FALTANTES" }, 400);
    }

    // 2) Validacao dos dados do pagador (e do cartao)
    const doc = digits(p.cpfCnpj);
    const cep = digits(p.postalCode);
    const phone = digits(p.phone);
    const name = String(p.name ?? "").trim();
    const email = String(p.email ?? "").trim();
    if (name.length < 3 || ![11, 14].includes(doc.length) || !EMAIL_RE.test(email) || phone.length < 10 || phone.length > 11 || cep.length !== 8 || !String(p.addressNumber ?? "").trim()) {
      return json({ error: "DADOS_PAGADOR_INVALIDOS", message: "Confira nome, CPF/CNPJ, e-mail, telefone, CEP e número." }, 400);
    }
    let card: Record<string, string> | null = null;
    if (method === "CREDIT_CARD") {
      const num = digits(c.number);
      const mm = digits(c.expiryMonth).padStart(2, "0");
      const yy = digits(c.expiryYear);
      const ccv = digits(c.ccv);
      const holder = String(c.holderName ?? "").trim();
      const now = new Date();
      const yFull = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
      if (num.length < 13 || num.length > 19 || Number(mm) < 1 || Number(mm) > 12 || !(yFull >= now.getFullYear()) ||
          (yFull === now.getFullYear() && Number(mm) < now.getMonth() + 1) || ccv.length < 3 || ccv.length > 4 || holder.length < 3) {
        return json({ error: "DADOS_CARTAO_INVALIDOS", message: "Confira os dados do cartão." }, 400);
      }
      card = { holderName: holder, number: num, expiryMonth: mm, expiryYear: String(yFull), ccv };
    }

    // 3) Loja do usuario
    const { data: store } = await admin
      .from("stores").select("id, owner_user_id, contact_name").eq("id", store_id).maybeSingle();
    if (!store || store.owner_user_id !== u.user.id) return json({ error: "LOJA_INVALIDA" }, 403);

    // 4) Plano e preco do ciclo
    const { data: dyn } = await admin
      .from("dynamic_plans")
      .select("id, plan_name, is_combo, module_slug, is_active, price_monthly_cents, price_semiannual_cents, price_annual_cents")
      .eq("id", plan_id).maybeSingle();
    if (!dyn || !dyn.is_active) return json({ error: "PLANO_INVALIDO" }, 400);
    const priceCents = cycle === "MONTHLY" ? dyn.price_monthly_cents : cycle === "SEMIANNUAL" ? dyn.price_semiannual_cents : dyn.price_annual_cents;
    if (!priceCents || priceCents < 500) return json({ error: "PLANO_INVALIDO" }, 400);

    // 5) Modulos cobertos e bloqueio de duplicidade
    let blockKeys: string[] = [];
    let moduleKey: string | null = null;
    if (dyn.is_combo) {
      const { data: cm } = await admin.from("combo_modules").select("module_slug").eq("plan_id", dyn.id);
      blockKeys = (cm ?? []).map((r: any) => r.module_slug);
      if (blockKeys.length < 2) return json({ error: "COMBO_INVALIDO" }, 400);
      moduleKey = "bundle";
    } else {
      moduleKey = dyn.module_slug;
      blockKeys = dyn.module_slug ? [dyn.module_slug] : [];
    }
    if (blockKeys.length) {
      const { data: dup } = await admin
        .from("subscriptions").select("id, status, module_key")
        .eq("store_id", store_id).in("module_key", [...blockKeys, "bundle"])
        .in("status", ["active", "trialing", "past_due", "lifetime"]).limit(1).maybeSingle();
      if (dup) return json({ error: "MODULE_ALREADY_SUBSCRIBED", module_key: dup.module_key, status: dup.status }, 409);
    }

    // 6) Add-ons (preco validado no servidor)
    let addonCents = 0;
    let oneTimeCents = 0;
    let oneTimeNames = "";
    if (addonIds.length) {
      const { data: ads } = await admin
        .from("addons").select("id, name, price_monthly, scope, upsell_module_target, billing_type")
        .in("id", addonIds).eq("is_active", true).eq("is_upsell", true);
      const ok = (ads ?? []).filter((a: any) =>
        (a.scope === "global" || blockKeys.includes(a.scope)) &&
        (a.upsell_module_target === "all" || blockKeys.includes(a.upsell_module_target)));
      if (ok.length !== addonIds.length) return json({ error: "ADDON_INDISPONIVEL" }, 400);
      addonCents = ok.filter((a: any) => a.billing_type !== "one_time").reduce((s: number, a: any) => s + Math.round(Number(a.price_monthly) * 100 * MONTHS[cycle]), 0);
      const otAds = ok.filter((a: any) => a.billing_type === "one_time");
      oneTimeCents = otAds.reduce((s: number, a: any) => s + Math.round(Number(a.price_monthly) * 100), 0);
      oneTimeNames = otAds.map((a: any) => a.name).join(" + ");
    }

    // 7) Cupom (desconto sobre o plano; fixed_amount em centavos)
    let couponId: string | null = null;
    let couponCharges: number | null = null;
    let discountCents = 0;
    const code = String(b.coupon_code ?? "").trim();
    if (code) {
      const { data: q } = await admin.rpc("validate_coupon", { p_code: code, p_plan_id: dyn.id });
      if (!q?.valid) return json({ error: "CUPOM_INVALIDO" }, 400);
      discountCents = q.type === "percentage" ? Math.round((priceCents * Number(q.value)) / 100) : Math.min(priceCents, Number(q.value));
      couponId = q.coupon_id ?? null;
      if (q.duration_type === "first_invoice") couponCharges = 1;
      else if (q.duration_type === "months" && Number(q.duration_months) > 0) couponCharges = Math.ceil(Number(q.duration_months) / MONTHS[cycle]);
    }
    // 7b) Beneficio de desconto (%) concedido no Master. Nao soma com cupom: vale o maior.
    let benefit: { id: string; pct: number; months: number | null } | null = null;
    {
      const { data: bn } = await admin
        .from("admin_store_benefits")
        .select("id, value, months")
        .eq("store_id", store_id).eq("kind", "discount_percent").eq("consumed", false)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const pct = Number(bn?.value);
      if (bn && Number.isFinite(pct) && pct > 0 && pct <= 100) {
        const bd = Math.round((priceCents * pct) / 100);
        if (bd > discountCents) {
          benefit = { id: bn.id, pct, months: bn.months ?? null };
          discountCents = bd;
          couponId = null;
        }
      }
    }
    const fullValueCents = priceCents + addonCents;
    const recurringCents = priceCents - discountCents + addonCents;
    const totalCents = recurringCents + oneTimeCents;
    if (totalCents < 500) return json({ error: "VALOR_INVALIDO" }, 400);

    // 8) Limpa tentativa anterior incompleta do mesmo modulo
    if (moduleKey) {
      const { data: stale } = await admin
        .from("subscriptions").select("id, asaas_subscription_id")
        .eq("store_id", store_id).eq("module_key", moduleKey).eq("status", "incomplete").eq("is_current", true);
      for (const s of stale ?? []) {
        if (s.asaas_subscription_id) await asaas(`/subscriptions/${s.asaas_subscription_id}`, "DELETE");
        await admin.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString(), is_current: false }).eq("id", s.id);
      }
    }

    // 9) Dados de faturamento (nao bloqueia se falhar)
    try {
      const row = { legal_name: name, cnpj_cpf: doc, email, phone, cep, address: String(p.address ?? ""), number: String(p.addressNumber), complement: String(p.complement ?? ""), neighborhood: String(p.province ?? "") };
      const { data: bi } = await admin.from("billing_info").select("store_id").eq("store_id", store_id).maybeSingle();
      const r = bi ? await admin.from("billing_info").update(row).eq("store_id", store_id) : await admin.from("billing_info").insert({ store_id, ...row });
      if (r.error) console.error("billing_info:", r.error.message);
    } catch (e) { console.error("billing_info:", String(e)); }

    // 10) Cliente no Asaas
    const { data: prev } = await admin
      .from("subscriptions").select("asaas_customer_id")
      .eq("store_id", store_id).not("asaas_customer_id", "is", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    let customerId: string | null = prev?.asaas_customer_id ?? null;
    if (!customerId) {
      const cu = await asaas("/customers", "POST", {
        name, cpfCnpj: doc, email, mobilePhone: phone, postalCode: cep,
        address: String(p.address ?? ""), addressNumber: String(p.addressNumber),
        complement: String(p.complement ?? ""), province: String(p.province ?? ""),
        externalReference: store_id,
      });
      if (!cu.ok) return json({ error: "ASAAS_CUSTOMER_ERROR", message: cu.data?.errors?.[0]?.description ?? "Não foi possível cadastrar o pagador." }, 400);
      customerId = cu.data.id;
    }

    // 11) Assinatura no Asaas (cartao cobra na hora; PIX gera QR)
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0.0.0.0";
    const brlC = (c: number) => "R$ " + (c / 100).toFixed(2).replace(".", ",");
    const baseDesc = `${dyn.plan_name} - SLL Hub`;
    const firstDesc = oneTimeCents > 0
      ? `Assinatura ${dyn.plan_name} (${brlC(recurringCents)}) + Setup/Add-on ${oneTimeNames} (${brlC(oneTimeCents)}) - SLL Hub`
      : baseDesc;
    const payload: Record<string, unknown> = {
      customer: customerId,
      billingType: method,
      nextDueDate: today,
      value: totalCents / 100,
      cycle: ASAAS_CYCLE[cycle],
      description: firstDesc,
      externalReference: store_id,
    };
    if (card) {
      payload.creditCard = card;
      payload.creditCardHolderInfo = {
        name: card.holderName, email, cpfCnpj: doc, postalCode: cep,
        addressNumber: String(p.addressNumber), addressComplement: String(p.complement ?? ""), phone, mobilePhone: phone,
      };
      payload.remoteIp = ip;
    }
    const sub = await asaas("/subscriptions", "POST", payload);
    if (!sub.ok) {
      const msg = sub.data?.errors?.[0]?.description ?? "Pagamento não autorizado.";
      return json({ error: card ? "PAGAMENTO_RECUSADO" : "ASAAS_SUBSCRIPTION_ERROR", message: msg }, 400);
    }

    // 12) Grava a assinatura (ativada pelo webhook quando o pagamento confirma)
    const end = new Date();
    end.setMonth(end.getMonth() + MONTHS[cycle]);
    const { data: saved, error: dbErr } = await admin.from("subscriptions").insert({
      store_id,
      plan_id: null,
      dynamic_plan_id: dyn.id,
      combo_kind: dyn.is_combo ? "fixed" : null,
      module_key: moduleKey,
      billing_cycle: cycle.toLowerCase(),
      status: "incomplete",
      current_period_start: new Date().toISOString(),
      current_period_end: end.toISOString(),
      asaas_customer_id: customerId,
      asaas_subscription_id: sub.data.id,
      billing_provider: "asaas",
      is_current: true,
      pending_addon_ids: addonIds,
      one_time_pending_cents: oneTimeCents,
      recurring_value_cents: oneTimeCents > 0 ? recurringCents : null,
      recurring_description: oneTimeCents > 0 ? baseDesc : null,
      coupon_id: couponId,
      benefit_id: benefit?.id ?? null,
      benefit_discount_percent: benefit?.pct ?? null,
      benefit_months_left: benefit ? (benefit.months ? Math.ceil(benefit.months / MONTHS[cycle]) : null) : couponCharges,
      benefit_full_value_cents: (benefit || couponCharges) ? fullValueCents : null,
    }).select("id").single();
    if (dbErr || !saved) {
      console.error("asaas-checkout DB_ERROR:", JSON.stringify(dbErr));
      await asaas(`/subscriptions/${sub.data.id}`, "DELETE");
      return json({ error: "DB_ERROR", message: "Não foi possível registrar a assinatura." }, 500);
    }
    if (couponId) await admin.rpc("redeem_coupon", { p_coupon_id: couponId });
    if (benefit) await admin.from("admin_store_benefits").update({ consumed: true }).eq("id", benefit.id);

    // 13) PIX: devolve o QR Code para exibir na propria tela
    let pix: { payload: string; image: string; expires_at: string | null } | null = null;
    let invoiceUrl: string | null = null;
    if (method === "PIX") {
      for (let i = 0; i < 4 && !pix; i++) {
        const pays = await asaas(`/subscriptions/${sub.data.id}/payments`);
        const first = pays.data?.data?.[0];
        if (first) {
          invoiceUrl = first.invoiceUrl ?? null;
          const qr = await asaas(`/payments/${first.id}/pixQrCode`);
          if (qr.ok && qr.data?.payload) pix = { payload: qr.data.payload, image: qr.data.encodedImage, expires_at: qr.data.expirationDate ?? null };
        }
        if (!pix) await new Promise((r) => setTimeout(r, 700));
      }
    }

    return json({ success: true, subscription_id: saved.id, method, total_cents: totalCents, pix, invoice_url: invoiceUrl });
  } catch (err) {
    console.error("asaas-checkout:", String(err));
    return json({ error: "UNEXPECTED_ERROR", message: "Erro inesperado. Tente novamente." }, 500);
  }
});