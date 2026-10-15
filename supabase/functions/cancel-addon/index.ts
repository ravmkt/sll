import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_API_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX"))!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function isSuperadmin(user: { id: string; app_metadata?: Record<string, unknown> }) {
  if (user.app_metadata?.is_superadmin === true) return true;
  const { data, error } = await db.from("admin_superusers").select("*").eq("user_id", user.id).limit(1);
  return !error && !!data && data.length > 0;
}

const monthsOf = (c: string | null) => {
  const v = String(c ?? "").toUpperCase();
  return v === "SEMIANNUAL" ? 6 : v === "YEARLY" ? 12 : 1;
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "NAO_AUTENTICADO" }, 401);
    const { data: ud, error: ue } = await db.auth.getUser(token);
    if (ue || !ud?.user) return json({ error: "NAO_AUTENTICADO" }, 401);
    const user = ud.user;

    const body = await req.json().catch(() => ({}));
    const id = body?.store_addon_id as string | undefined;
    const action = body?.action as string | undefined;
    if (!id || (action !== "cancel" && action !== "keep")) return json({ error: "PARAMETROS_INVALIDOS" }, 400);

    const { data: sa } = await db.from("store_addons")
      .select("id, store_id, addon_id, quantity, status, subscription_id, cancel_at_period_end, ends_at")
      .eq("id", id).maybeSingle();
    if (!sa) return json({ error: "ADDON_NAO_ENCONTRADO" }, 404);

    const [{ data: store }, { data: addon }, { data: sub }] = await Promise.all([
      db.from("stores").select("owner_user_id").eq("id", sa.store_id).maybeSingle(),
      db.from("addons").select("name, price_monthly, billing_type").eq("id", sa.addon_id).maybeSingle(),
      db.from("subscriptions")
        .select("id, asaas_subscription_id, billing_cycle, status, is_current, one_time_pending_cents, benefit_full_value_cents")
        .eq("id", sa.subscription_id).maybeSingle(),
    ]);

    if (!store || !addon) return json({ error: "ADDON_NAO_ENCONTRADO" }, 404);
    if (store.owner_user_id !== user.id && !(await isSuperadmin(user))) return json({ error: "NAO_AUTORIZADO" }, 403);
    if (sa.status !== "active") return json({ error: "ADDON_NAO_ATIVO" }, 409);
    if (addon.billing_type === "one_time") return json({ error: "ADDON_AVULSO" }, 400);
    if (!sub?.asaas_subscription_id || !sub.is_current || !["active", "trialing"].includes(sub.status)) {
      return json({ error: "ASSINATURA_INDISPONIVEL" }, 409);
    }
    if (Number(sub.one_time_pending_cents ?? 0) > 0) return json({ error: "AGUARDANDO_PRIMEIRO_PAGAMENTO" }, 409);

    if (action === "cancel" && sa.cancel_at_period_end) return json({ success: true, already: true, ends_at: sa.ends_at });
    if (action === "keep" && !sa.cancel_at_period_end) return json({ success: true, already: true });
    if (action === "keep" && sa.ends_at && Date.parse(sa.ends_at) <= Date.now()) return json({ error: "CICLO_ENCERRADO" }, 409);

    const h = { access_token: ASAAS_API_KEY, "Content-Type": "application/json" };
    const asaasId = sub.asaas_subscription_id as string;

    const getRes = await fetch(`${ASAAS_API_URL}/subscriptions/${asaasId}`, { headers: h });
    const asaasSub = await getRes.json().catch(() => ({}));
    if (!getRes.ok) return json({ error: "ASAAS_ERROR", details: asaasSub }, 400);

    const currentCents = Math.round(Number(asaasSub.value ?? 0) * 100);
    const deltaCents = Math.round(Number(addon.price_monthly) * 100 * monthsOf(sub.billing_cycle) * Number(sa.quantity ?? 1));
    const sign = action === "cancel" ? -1 : 1;
    const newCents = currentCents + sign * deltaCents;
    if (newCents < 500) return json({ error: "VALOR_MINIMO" }, 400);

    let endsAt: string | null = null;
    if (action === "cancel") {
      const pr = await fetch(`${ASAAS_API_URL}/payments?subscription=${asaasId}&status=PENDING&limit=100`, { headers: h });
      const pb = await pr.json().catch(() => ({}));
      const dues = ((pb?.data ?? []) as { dueDate?: string }[]).map((p) => p.dueDate).filter(Boolean).sort() as string[];
      const dueDate = dues[0] ?? (asaasSub.nextDueDate as string | undefined);
      if (!dueDate) return json({ error: "VENCIMENTO_INDEFINIDO" }, 409);
      endsAt = new Date(`${dueDate}T00:00:00-03:00`).toISOString();
    }

    const put = await fetch(`${ASAAS_API_URL}/subscriptions/${asaasId}`, {
      method: "PUT", headers: h,
      body: JSON.stringify({ value: newCents / 100, updatePendingPayments: true }),
    });
    const putBody = await put.json().catch(() => ({}));
    console.log("cancel-addon PUT", asaasId, put.status, JSON.stringify(putBody));
    if (!put.ok) return json({ error: "ASAAS_ERROR", details: putBody }, 400);

    const patch = action === "cancel"
      ? { cancel_at_period_end: true, ends_at: endsAt }
      : { cancel_at_period_end: false, ends_at: null };
    const { error: upErr } = await db.from("store_addons").update(patch).eq("id", id);
    if (upErr) {
      await fetch(`${ASAAS_API_URL}/subscriptions/${asaasId}`, {
        method: "PUT", headers: h,
        body: JSON.stringify({ value: currentCents / 100, updatePendingPayments: true }),
      }).catch(() => null);
      return json({ error: "DB_ERROR", details: upErr }, 500);
    }

    if (sub.benefit_full_value_cents != null) {
      await db.from("subscriptions")
        .update({ benefit_full_value_cents: Math.max(0, Number(sub.benefit_full_value_cents) + sign * deltaCents) })
        .eq("id", sub.id);
    }

    await db.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: action === "cancel" ? "addon_cancel_scheduled" : "addon_cancel_reverted",
      details: { store_id: sa.store_id, store_addon_id: id, addon: addon.name, from_cents: currentCents, to_cents: newCents, ends_at: endsAt },
    }).then(() => null, (e: unknown) => console.error("audit falhou", e));

    return json({ success: true, ends_at: endsAt, new_value_cents: newCents });
  } catch (err) {
    return json({ error: "UNEXPECTED_ERROR", details: String(err) }, 500);
  }
});