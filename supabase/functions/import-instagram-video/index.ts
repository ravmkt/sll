import { createClient } from "npm:@supabase/supabase-js@2";
import { getInstagramToken } from "../_shared/instagram-token.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_BYTES = 100 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { storeId, mediaId } = await req.json();
    if (!storeId || !mediaId || !/^\d+$/.test(String(mediaId))) {
      return json({ success: false, error: "Parâmetros inválidos." });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ success: false, error: "Não autorizado." });

    const { data: store } = await asUser.from("stores").select("id")
      .eq("id", storeId).eq("owner_user_id", user.id).maybeSingle();
    if (!store) return json({ success: false, error: "Sem permissão para esta loja." });

    const admin = createClient(url, key);
    const vid = createClient(url, key, { db: { schema: "vidlytics" } });

    const { data: own } = await admin.from("store_integrations").select("id")
      .eq("store_id", storeId).eq("platform", "instagram").maybeSingle();
    if (!own) return json({ success: false, error: "Instagram não conectado nesta loja." });

    const { data: dup } = await vid.from("vid_videos").select("id")
      .eq("store_id", storeId).like("video_url", `%/ig_${mediaId}.mp4`).limit(1).maybeSingle();
    if (dup) return json({ success: true, videoId: dup.id, duplicate: true });

    const token = await getInstagramToken(admin, storeId);

    const metaRes = await fetch(
      `https://graph.instagram.com/${mediaId}?fields=id,caption,media_type,media_url,thumbnail_url&access_token=${encodeURIComponent(token)}`,
    );
    const meta = await metaRes.json();
    if (!metaRes.ok || meta.error) throw new Error(meta.error?.message || "Não foi possível ler o vídeo no Instagram.");
    if (meta.media_type !== "VIDEO" || !meta.media_url) throw new Error("Esta mídia não é um vídeo ou não está disponível para download.");

    const fileRes = await fetch(meta.media_url);
    if (!fileRes.ok) throw new Error(`Falha ao baixar o vídeo (HTTP ${fileRes.status}).`);
    if (Number(fileRes.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("O vídeo excede 100 MB.");
    const buf = await fileRes.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) throw new Error("O vídeo excede 100 MB.");

    const videoPath = `${storeId}/ig_${mediaId}.mp4`;
    const { error: upErr } = await admin.storage.from("videos")
      .upload(videoPath, buf, { contentType: "video/mp4", cacheControl: "3600", upsert: true });
    if (upErr) throw new Error(upErr.message);
    const videoUrl = admin.storage.from("videos").getPublicUrl(videoPath).data.publicUrl;

    let thumbUrl = "";
    if (meta.thumbnail_url) {
      try {
        const tr = await fetch(meta.thumbnail_url);
        if (tr.ok) {
          const tb = await tr.arrayBuffer();
          const thumbPath = `${storeId}/thumbnails/ig_${mediaId}.jpg`;
          const { error: tErr } = await admin.storage.from("videos")
            .upload(thumbPath, tb, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
          if (!tErr) thumbUrl = admin.storage.from("videos").getPublicUrl(thumbPath).data.publicUrl;
        }
      } catch (_) { /* segue sem capa */ }
    }

    const caption = String(meta.caption ?? "").trim();
    const { data: row, error: dbErr } = await vid.from("vid_videos").insert({
      store_id: storeId,
      title: caption ? caption.slice(0, 60) : `INSTAGRAM_REELS_${String(mediaId).slice(-6)}`,
      video_url: videoUrl,
      thumbnail_url: thumbUrl,
      status: "active",
      active: true,
      file_size_bytes: buf.byteLength,
      duration: 0,
      video_source_type: "upload",
    }).select("id").single();
    if (dbErr) throw new Error(dbErr.message);

    return json({ success: true, videoId: row.id, duplicate: false });
  } catch (e) {
    console.error("import-instagram-video:", (e as any)?.message ?? e);
    return json({ success: false, error: (e as any)?.message ?? "Erro ao importar vídeo." });
  }
});