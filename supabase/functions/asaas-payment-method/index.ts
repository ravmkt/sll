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

const when = (p: any) => String(p.confirmedDate ?? p.paymentDate ?? p.dateCreated ?? "");

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "NAO_AUTENTICADO" }, 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "NAO_AUTENTICADO" }, 401);

    const { store_id } = await req.json().catch(() => ({}));
    if (!store_id) return json({ error: "STORE_ID_OBRIGATORIO" }, 400);

    const { data: store } = await admin.from("stores").select("id, owner_user_id").eq("id", store_id).maybeSingle();
    if (!store || store.owner_user_id !== u.user.id) return json({ error: "LOJA_INVALIDA" }, 403);

    const { data: subs } = await admin
      .from("subscriptions")
      .select("asaas_subscription_id")
      .eq("store_id", store_id)
      .eq("is_current", true)
      .in("status", ["active", "past_due", "trialing"])
      .not("asaas_subscription_id", "is", null);

    const h = { access_token: KEY };
    let best: { brand: string | null; last4: string | null; at: string } | null = null;

    for (const s of subs ?? []) {
      const id = s.asaas_subscription_id as string;
      try {
        const sr = await fetch(`${API}/subscriptions/${id}`, { headers: h });
        const sb = await sr.json().catch(() => ({}));
        const sc = sb?.creditCard;
        if (sc?.creditCardNumber) {
          best = { brand: sc.creditCardBrand ?? null, last4: String(sc.creditCardNumber).slice(-4), at: "9999" };
          break;
        }
        for (const st of ["RECEIVED", "CONFIRMED"]) {
          const pr = await fetch(`${API}/payments?subscription=${id}&status=${st}&limit=20`, { headers: h });
          const pb = await pr.json().catch(() => ({}));
          for (const p of (pb?.data ?? []) as any[]) {
            const cc = p?.creditCard;
            if (!cc?.creditCardNumber) continue;
            const at = when(p);
            if (!best || at > best.at) {
              best = { brand: cc.creditCardBrand ?? null, last4: String(cc.creditCardNumber).slice(-4), at };
            }
          }
        }
      } catch (e) {
        console.error("payment-method falhou", id, String(e));
      }
    }

    return json({ card: best ? { brand: best.brand, last4: best.last4 } : null, subscriptions: (subs ?? []).length });
  } catch (e) {
    return json({ error: "UNEXPECTED_ERROR", details: String(e) }, 500);
  }
});