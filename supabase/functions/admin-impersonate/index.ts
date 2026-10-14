import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const asUser = createClient(URL_, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await asUser.auth.getUser();
  if (!u?.user) return json({ error: "Não autenticado." }, 401);
  const { data: ok } = await asUser.rpc("is_superadmin");
  if (ok !== true) return json({ error: "Sem permissão de SuperAdmin." }, 403);

  const body = await req.json().catch(() => ({}));
  const storeId = String(body?.store_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) return json({ error: "Loja inválida." }, 400);
  const redirectTo = String(body?.redirect_to ?? "");

  const admin = createClient(URL_, SERVICE);
  const { data: st } = await admin.from("stores").select("id,name,owner_user_id").eq("id", storeId).maybeSingle();
  if (!st?.owner_user_id) return json({ error: "Loja sem usuário dono." }, 404);
  const { data: owner } = await admin.auth.admin.getUserById(st.owner_user_id);
  const email = owner?.user?.email;
  if (!email) return json({ error: "Dono sem e-mail." }, 404);

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error || !link?.properties?.action_link) return json({ error: error?.message || "Não foi possível gerar o link." }, 500);

  await admin.from("admin_audit_logs").insert({
    admin_id: u.user.id,
    action: "store_impersonation_link",
    details: { store_id: storeId, name: st.name },
  });
  return json({ link: link.properties.action_link });
});