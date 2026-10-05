import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidAccessToken } from "../_shared/tiktok-token.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

const FIELDS = "id,title,video_description,cover_image_url,embed_link,share_url,duration,width,height,create_time,view_count,like_count,comment_count,share_count";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: "Não autenticado." });

    const { storeId, cursor } = await req.json();
    if (!storeId) return json({ success: false, error: "storeId é obrigatório." });

    const { data: store } = await userClient
      .from("stores").select("id").eq("id", storeId).eq("owner_user_id", user.id).maybeSingle();
    if (!store) return json({ success: false, error: "Sem permissão para esta loja." });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const accessToken = await getValidAccessToken(admin, storeId);

    const body: Record<string, unknown> = { max_count: 20 };
    if (cursor) body.cursor = cursor;

    const resp = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${FIELDS}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();

    if (!resp.ok || (data.error && data.error.code !== "ok")) {
      console.error("TikTok video/list:", JSON.stringify(data));
      return json({ success: false, error: data?.error?.message || `TikTok API HTTP ${resp.status}` });
    }

    return json({
      success: true,
      videos: data.data?.videos ?? [],
      cursor: data.data?.cursor ?? null,
      has_more: !!data.data?.has_more,
    });
  } catch (e) {
    console.error("get-tiktok-media:", e);
    return json({ success: false, error: (e as Error).message });
  }
});
