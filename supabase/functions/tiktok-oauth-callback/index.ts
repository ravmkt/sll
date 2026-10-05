import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyState } from "../_shared/oauth-state.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.sllhub.com.br";
const RETURN_PATH = Deno.env.get("TIKTOK_RETURN_PATH") ?? "/configuracoes";

const back = (params: Record<string, string>) => {
  const url = new URL(RETURN_PATH, APP_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return Response.redirect(url.toString(), 302);
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      return back({ tiktok: "error", message: url.searchParams.get("error_description") || oauthError });
    }

    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    if (!code || !stateParam) throw new Error("Parâmetros ausentes: code ou state.");

    const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
    const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");
    const stateSecret = Deno.env.get("TIKTOK_STATE_SECRET");
    if (!clientKey || !clientSecret || !stateSecret) throw new Error("Credenciais do TikTok não configuradas.");

    const state = await verifyState(stateParam, stateSecret);
    const storeId = state.s;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Confirma que o usuário do state ainda é dono da loja
    const { data: store } = await admin
      .from("stores").select("id").eq("id", storeId).eq("owner_user_id", state.u).maybeSingle();
    if (!store) throw new Error("Loja não pertence ao usuário que iniciou a conexão.");

    // 1. code -> tokens
    const tokenResp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${supabaseUrl}/functions/v1/tiktok-oauth-callback`,
      }),
    });
    const tk = await tokenResp.json();
    if (!tokenResp.ok || tk.error || !tk.access_token) {
      throw new Error(`Erro ao trocar código por token: ${tk.error_description || tk.error || "resposta inválida"}`);
    }

    const grantedScopes: string[] = String(tk.scope ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);

    // 2. perfil, campos conforme os scopes concedidos
    const fields = ["open_id", "union_id", "avatar_url", "display_name"];
    if (grantedScopes.includes("user.info.profile")) fields.push("bio_description", "profile_deep_link", "is_verified", "username");
    if (grantedScopes.includes("user.info.stats")) fields.push("follower_count", "following_count", "likes_count", "video_count");

    let profile: Record<string, unknown> = {};
    try {
      const uiResp = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields.join(",")}`, {
        headers: { Authorization: `Bearer ${tk.access_token}` },
      });
      const ui = await uiResp.json();
      profile = ui?.data?.user ?? {};
    } catch (e) {
      console.warn("Falha ao buscar perfil do TikTok:", e);
    }

    const now = Date.now();
    const tokenExpiresAt = new Date(now + Number(tk.expires_in ?? 0) * 1000).toISOString();
    const refreshExpiresAt = tk.refresh_expires_in
      ? new Date(now + Number(tk.refresh_expires_in) * 1000).toISOString()
      : null;

    // 3. dados públicos
    const { data: integ, error: integErr } = await admin
      .from("store_integrations")
      .upsert(
        {
          store_id: storeId,
          platform: "tiktok",
          account_id: tk.open_id,
          account_username: (profile.username as string) || (profile.display_name as string) || tk.open_id,
          display_name: (profile.display_name as string) ?? null,
          avatar_url: (profile.avatar_url as string) ?? null,
          scopes: grantedScopes,
          status: "active",
          profile,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,platform" },
      )
      .select("id")
      .single();
    if (integErr || !integ) throw integErr ?? new Error("Falha ao salvar integração.");

    // 4. tokens (tabela só do service_role)
    const { error: secErr } = await admin.from("store_integration_secrets").upsert({
      integration_id: integ.id,
      access_token: tk.access_token,
      refresh_token: tk.refresh_token ?? null,
      token_expires_at: tokenExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      updated_at: new Date().toISOString(),
    });
    if (secErr) throw secErr;

    return back({ tiktok: "connected" });
  } catch (e) {
    console.error("tiktok-oauth-callback:", e);
    return back({ tiktok: "error", message: (e as Error).message });
  }
});
