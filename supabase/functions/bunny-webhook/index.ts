import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const secret = Deno.env.get("BUNNY_WEBHOOK_SECRET");
  if (new URL(req.url).searchParams.get("s") !== secret) return new Response("forbidden", { status: 403 });

  const { VideoGuid, Status } = await req.json();
  const libId = Deno.env.get("BUNNY_LIBRARY_ID")!;
  const host = Deno.env.get("BUNNY_CDN_HOST")!;
  const vid = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!).schema("vidlytics");

  if (Status === 5) {
    await vid.from("vid_videos").update({ status: "failed" }).eq("bunny_video_id", VideoGuid);
  } else if (Status === 3 || Status === 4) {
    const r = await fetch(`https://video.bunnycdn.com/library/${libId}/videos/${VideoGuid}`, {
      headers: { AccessKey: Deno.env.get("BUNNY_API_KEY")! },
    });
    const v = r.ok ? await r.json() : {};
    await vid.from("vid_videos").update({
      status: "ready",
      hls_url: `https://${host}/${VideoGuid}/playlist.m3u8`,
      preview_url: `https://${host}/${VideoGuid}/preview.webp`,
      thumb_url: `https://${host}/${VideoGuid}/thumbnail.jpg`,
      duration_seconds: Math.round(v.length ?? 0),
      size_bytes: v.storageSize ?? 0,
    }).eq("bunny_video_id", VideoGuid);
  }
  return new Response("ok");
});
