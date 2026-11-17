import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { store_id, title } = await req.json();
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: store } = await admin.from("stores").select("id, plan, owner_id").eq("id", store_id).single();
    if (!store || store.owner_id !== user.id) return json({ error: "forbidden" }, 403);

    const { data: limits } = await admin.from("plan_limits").select("*").eq("plan", store.plan ?? "basic").single();
    if (!limits) return json({ error: "plan_not_found" }, 400);

    const vid = admin.schema("vidlytics");
    const { data: rows } = await vid.from("vid_videos").select("size_bytes").eq("store_id", store_id);
    const count = rows?.length ?? 0;
    const used = (rows ?? []).reduce((a, r) => a + Number(r.size_bytes ?? 0), 0);
    if (count >= limits.max_videos) return json({ error: "video_limit_reached" }, 403);
    if (used >= Number(limits.max_storage_gb) * 1024 ** 3) return json({ error: "storage_limit_reached" }, 403);

    const libId = Deno.env.get("BUNNY_LIBRARY_ID")!;
    const apiKey = Deno.env.get("BUNNY_API_KEY")!;
    const r = await fetch(`https://video.bunnycdn.com/library/${libId}/videos`, {
      method: "POST",
      headers: { AccessKey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ title: title ?? "video" }),
    });
    if (!r.ok) return json({ error: "bunny_create_failed" }, 502);
    const { guid } = await r.json();

    const { error } = await vid.from("vid_videos").insert({
      store_id, title: title ?? "video", bunny_video_id: guid, status: "processing",
    });
    if (error) return json({ error: error.message }, 500);

    const expire = Math.floor(Date.now() / 1000) + 3600;
    const signature = await sha256(`${libId}${apiKey}${expire}${guid}`);
    return json({
      video_id: guid,
      endpoint: "https://video.bunnycdn.com/tusupload",
      headers: { AuthorizationSignature: signature, AuthorizationExpire: String(expire), VideoId: guid, LibraryId: libId },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
