import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const DAY = 86_400_000;

export async function getInstagramToken(admin: SupabaseClient, storeId: string): Promise<string> {
  const { data: integ } = await admin
    .from("store_integrations").select("id")
    .eq("store_id", storeId).eq("platform", "instagram").maybeSingle();
  if (!integ) throw new Error("Instagram não conectado nesta loja.");

  const { data: sec } = await admin
    .from("store_integration_secrets").select("*")
    .eq("integration_id", integ.id).maybeSingle();
  if (!sec?.access_token) throw new Error("Token do Instagram não encontrado. Reconecte a conta.");

  const expiresAt = sec.token_expires_at ? new Date(sec.token_expires_at).getTime() : 0;
  const left = expiresAt - Date.now();
  if (left > 7 * DAY) return sec.access_token;

  const resp = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(sec.access_token)}`,
  );
  const tk = await resp.json().catch(() => ({}));
  if (!resp.ok || tk.error || !tk.access_token) {
    if (left > 60_000) return sec.access_token;
    await admin.from("store_integrations")
      .update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", integ.id);
    throw new Error("Sessão do Instagram expirada. Reconecte a conta.");
  }

  const newExp = new Date(Date.now() + Number(tk.expires_in ?? 5184000) * 1000).toISOString();
  await admin.from("store_integration_secrets").update({
    access_token: tk.access_token,
    token_expires_at: newExp,
    updated_at: new Date().toISOString(),
  }).eq("integration_id", integ.id);
  await admin.from("store_integrations")
    .update({ token_expires_at: newExp, status: "active", updated_at: new Date().toISOString() }).eq("id", integ.id);
  return tk.access_token;
}