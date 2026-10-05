import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function getValidAccessToken(admin: SupabaseClient, storeId: string): Promise<string> {
  const { data: integ } = await admin
    .from("store_integrations").select("id")
    .eq("store_id", storeId).eq("platform", "tiktok").maybeSingle();
  if (!integ) throw new Error("TikTok não conectado nesta loja.");

  const { data: sec } = await admin
    .from("store_integration_secrets").select("*")
    .eq("integration_id", integ.id).maybeSingle();
  if (!sec?.access_token) throw new Error("Token do TikTok não encontrado. Reconecte a conta.");

  const expiresAt = sec.token_expires_at ? new Date(sec.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 60_000) return sec.access_token;

  // Access token expirado: renova com o refresh_token
  const markExpired = async () => {
    await admin.from("store_integrations").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", integ.id);
  };
  if (!sec.refresh_token) { await markExpired(); throw new Error("Sessão do TikTok expirada. Reconecte a conta."); }

  const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: Deno.env.get("TIKTOK_CLIENT_KEY")!,
      client_secret: Deno.env.get("TIKTOK_CLIENT_SECRET")!,
      grant_type: "refresh_token",
      refresh_token: sec.refresh_token,
    }),
  });
  const tk = await resp.json();
  if (!resp.ok || tk.error || !tk.access_token) {
    await markExpired();
    throw new Error("Sessão do TikTok expirada. Reconecte a conta.");
  }

  const now = Date.now();
  const newExp = new Date(now + Number(tk.expires_in ?? 0) * 1000).toISOString();
  await admin.from("store_integration_secrets").update({
    access_token: tk.access_token,
    refresh_token: tk.refresh_token ?? sec.refresh_token,
    token_expires_at: newExp,
    refresh_expires_at: tk.refresh_expires_in ? new Date(now + Number(tk.refresh_expires_in) * 1000).toISOString() : sec.refresh_expires_at,
    updated_at: new Date().toISOString(),
  }).eq("integration_id", integ.id);
  await admin.from("store_integrations").update({ token_expires_at: newExp, status: "active", updated_at: new Date().toISOString() }).eq("id", integ.id);

  return tk.access_token;
}
