import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") ?? "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
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

    const { subscription_id } = await req.json();
    if (!subscription_id) {
      return jsonResponse({ error: "SUBSCRIPTION_ID_OBRIGATORIO" }, 400);
    }

    // 1. Busca a assinatura e confirma que pertence a uma loja do usuário
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id, store_id, asaas_subscription_id, status, stores!inner(owner_user_id)")
      .eq("id", subscription_id)
      .maybeSingle();

    if (subErr || !sub) {
      return jsonResponse({ error: "ASSINATURA_NAO_ENCONTRADA" }, 404);
    }

    const store = sub.stores as unknown as { owner_user_id: string };
    if (store.owner_user_id !== userData.user.id) {
      return jsonResponse({ error: "NAO_AUTORIZADO" }, 403);
    }

    if (sub.status === "canceled") {
      return jsonResponse({ success: true, message: "Assinatura já estava cancelada." });
    }

    // 2. Cancela no Asaas (se houver ID remoto)
    if (sub.asaas_subscription_id) {
      const asaasRes = await fetch(
        `${ASAAS_API_URL}/subscriptions/${sub.asaas_subscription_id}`,
        {
          method: "DELETE",
          headers: { access_token: ASAAS_API_KEY },
        }
      );

      // Asaas retorna 200 mesmo em cancelamento; só bloqueia em erro real (ex: já não existe -> ignora)
      if (!asaasRes.ok && asaasRes.status !== 404) {
        const errData = await asaasRes.json().catch(() => ({}));
        return jsonResponse({ error: "ASAAS_CANCEL_ERROR", details: errData }, 400);
      }
    }

    // 3. Atualiza status local
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

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: "UNEXPECTED_ERROR", details: String(err) }, 500);
  }
});
