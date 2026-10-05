import { createClient } from "npm:@supabase/supabase-js@2";
import { getInstagramToken } from "../_shared/instagram-token.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { storeId, cursor } = await req.json();
    if (!storeId) return json({ success: false, error: "storeId é obrigatório." });

    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ success: false, error: "Não autorizado." });

    const { data: own } = await asUser.from("store_integrations").select("id")
      .eq("store_id", storeId).eq("platform", "instagram").maybeSingle();
    if (!own) return json({ success: false, error: "Instagram não conectado nesta loja." });

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = await getInstagramToken(admin, storeId);

    const qs = new URLSearchParams({
      fields: "id,caption,media_type,media_product_type,thumbnail_url,permalink,timestamp",
      limit: "30",
      access_token: token,
    });
    if (cursor) qs.set("after", String(cursor));

    const res = await fetch(`https://graph.instagram.com/me/media?${qs.toString()}`);
    const d = await res.json();
    if (!res.ok || d.error) throw new Error(d.error?.message || "Falha ao listar mídias do Instagram.");

    const videos = (d.data ?? [])
      .filter((m: any) => m.media_type === "VIDEO")
      .map((m: any) => ({
        id: m.id,
        caption: m.caption ?? "",
        thumbnail_url: m.thumbnail_url ?? "",
        permalink: m.permalink ?? "",
        timestamp: m.timestamp ?? "",
        product_type: m.media_product_type ?? "",
      }));

    return json({ success: true, videos, cursor: d.paging?.cursors?.after ?? null, has_more: !!d.paging?.next });
  } catch (e) {
    console.error("get-instagram-media:", (e as Error).message);
    return json({ success: false, error: (e as Error).message });
  }
});