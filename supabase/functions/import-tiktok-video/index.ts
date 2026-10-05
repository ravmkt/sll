import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidAccessToken } from "../_shared/tiktok-token.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

const FIELDS = "id,title,video_description,cover_image_url,embed_link,share_url,duration";

async function saveCover(admin: any, storeId: string, videoId: string, url?: string): Promise<string> {
  if (!url) return "";
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const type = r.headers.get("content-type") || "image/jpeg";
    const ext = type.includes("webp") ? "webp" : type.includes("png") ? "png" : "jpg";
    const path = `${storeId}/thumbnails/tiktok_${videoId}.${ext}`;
    const { error } = await admin.storage.from("videos").upload(path, await r.arrayBuffer(), { contentType: type, upsert: true });
    if (error) throw error;
    return admin.storage.from("videos").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("saveCover:", (e as Error).message);
    return url;
  }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: "Não autenticado." });

    const { storeId, videoId } = await req.json();
    if (!storeId || !videoId) return json({ success: false, error: "storeId e videoId são obrigatórios." });

    const { data: store } = await userClient
      .from("stores").select("id").eq("id", storeId).eq("owner_user_id", user.id).maybeSingle();
    if (!store) return json({ success: false, error: "Sem permissão para esta loja." });

    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, key);
    const vid = createClient(supabaseUrl, key, { db: { schema: "vidlytics" } });

    // Revalida o vídeo direto no TikTok (só vídeos da conta conectada)
    const accessToken = await getValidAccessToken(admin, storeId);
    const resp = await fetch(`https://open.tiktokapis.com/v2/video/query/?fields=${FIELDS}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { video_ids: [String(videoId)] } }),
    });
    const data = await resp.json();
    if (!resp.ok || (data.error && data.error.code !== "ok")) {
      console.error("TikTok video/query:", JSON.stringify(data));
      return json({ success: false, error: data?.error?.message || `TikTok API HTTP ${resp.status}` });
    }
    const v = data.data?.videos?.[0];
    if (!v) return json({ success: false, error: "Vídeo não encontrado na sua conta do TikTok." });

    const embedUrl = v.embed_link || `https://www.tiktok.com/embed/v2/${v.id}`;
    const coverUrl = await saveCover(admin, storeId, String(v.id), v.cover_image_url);

    const { data: existing } = await vid
      .from("vid_videos").select("id").eq("store_id", storeId).eq("video_url", embedUrl).maybeSingle();
    if (existing) {
      if (coverUrl) await vid.from("vid_videos").update({ thumbnail_url: coverUrl }).eq("id", existing.id);
      return json({ success: true, videoId: existing.id, duplicate: true });
    }

    const title = String(v.title || v.video_description || `TikTok ${v.id}`).trim().slice(0, 60);

    const { data: row, error } = await vid.from("vid_videos").insert({
      store_id: storeId,
      title,
      video_url: embedUrl,
      thumbnail_url: coverUrl,
      status: "active",
      active: true,
      file_size_bytes: 0,
      duration: Number(v.duration ?? 0),
      video_source_type: "tiktok",
    }).select("id").single();
    if (error) throw new Error(error.message);

    return json({ success: true, videoId: row.id, duplicate: false });
  } catch (e) {
    console.error("import-tiktok-video:", e);
    return json({ success: false, error: (e as Error).message });
  }
});
