import { createClient } from "npm:@supabase/supabase-js@2";
import { createState } from "../_shared/oauth-state.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
    const stateSecret = Deno.env.get("TIKTOK_STATE_SECRET");
    if (!clientKey || !stateSecret) return json({ error: "TikTok não configurado no servidor." }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autenticado." }, 401);

    const { storeId } = await req.json();
    if (!storeId) return json({ error: "storeId ausente." }, 400);

    const { data: store } = await userClient
      .from("stores").select("id").eq("id", storeId).eq("owner_user_id", user.id).maybeSingle();
    if (!store) return json({ error: "Sem permissão para esta loja." }, 403);

    const scopes = Deno.env.get("TIKTOK_SCOPES") ?? "user.info.basic,user.info.profile,user.info.stats,video.list";
    const state = await createState(storeId, user.id, stateSecret);

    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", clientKey);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes);
    url.searchParams.set("redirect_uri", `${supabaseUrl}/functions/v1/tiktok-oauth-callback`);
    url.searchParams.set("state", state);

    return json({ url: url.toString() });
  } catch (e) {
    console.error("tiktok-oauth-start:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
