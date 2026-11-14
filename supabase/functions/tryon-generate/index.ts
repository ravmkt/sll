import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64, encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const API = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash-image";
const MAX_BYTES = 6 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OK_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
};

const sha256 = async (v: Uint8Array | string) => {
  const data = typeof v === "string" ? new TextEncoder().encode(v) : v;
  const h = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
};

const extOf = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");

function parsePhoto(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!OK_MIME.has(mime)) return null;
  try {
    const bytes = decodeBase64(m[2].replace(/\s/g, ""));
    if (bytes.length < 1000 || bytes.length > MAX_BYTES) return null;
    return { mime, bytes };
  } catch (_) {
    return null;
  }
}

async function fetchGarment(url: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  let u: URL;
  try { u = new URL(url); } catch (_) { return null; }
  if (u.protocol !== "https:") return null;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(u.hostname) || u.hostname.endsWith(".internal")) return null;
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!r || !r.ok) return null;
  const mime = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!OK_MIME.has(mime)) return null;
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length < 500 || buf.length > MAX_BYTES) return null;
  return { mime, bytes: buf };
}

const PROMPT =
  "Task: virtual try-on image edit. Image 1 is the customer. Image 2 is a product photo of a garment worn by another model. " +
  "Edit image 1 so the customer is now wearing the garment from image 2 INSTEAD of her current clothes. The change must be clearly visible: completely cover and replace her current top, including any lace or sheer sleeves, so nothing of the old top shows. " +
  "The garment must match image 2 in color, cut, collar, buttons, zipper, pockets and length, fitted to the customer's own body size. Use only the garment from image 2, never the model's face, body or skin. " +
  "Everything else comes from image 1: her face, hair, skin tone on all visible skin, body proportions, pose and background. Output only the edited image, no text.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (limited(ip)) return json({ error: "rate_limited" }, 429);
  if (!GEMINI_KEY) return json({ error: "ia_nao_configurada" }, 500);

  let body: any;
  try { body = await req.json(); } catch (_) { return json({ error: "invalid_json" }, 400); }

  const storeId = String(body?.store_id ?? "");
  const productId = body?.product_id ? String(body.product_id) : null;
  const session = String(body?.session_id ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  const consentVersion = String(body?.consent_version ?? "v1").slice(0, 20);

  if (!UUID_RE.test(storeId)) return json({ error: "invalid_store" }, 400);
  if (productId && !UUID_RE.test(productId)) return json({ error: "invalid_product" }, 400);
  if (!session) return json({ error: "invalid_session" }, 400);
  if (body?.consent !== true) return json({ error: "consent_required" }, 400);

  const photo = parsePhoto(String(body?.person_image ?? ""));
  if (!photo) return json({ error: "invalid_photo" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const tdb = admin.schema("tryon");

  const { data: st } = await tdb.from("settings").select("enabled, photo_retention_days").eq("store_id", storeId).maybeSingle();
  if (!st?.enabled) return json({ error: "tryon_disabled" }, 403);

  let garmentUrl = String(body?.garment_image_url ?? "");
  if (productId) {
    const { data: p } = await tdb.from("products").select("garment_image_url").eq("id", productId).eq("store_id", storeId).maybeSingle();
    if (!p?.garment_image_url) return json({ error: "product_not_found" }, 404);
    garmentUrl = p.garment_image_url;
  }
  if (!garmentUrl) return json({ error: "garment_required" }, 400);

  const garment = await fetchGarment(garmentUrl);
  if (!garment) return json({ error: "invalid_garment" }, 400);

  const { data: cfg } = await admin.from("admin_ai_settings").select("model").eq("purpose", "tryon").maybeSingle();
  const model = cfg?.model || DEFAULT_MODEL;

  const cacheKey = await sha256(`${storeId}|${await sha256(photo.bytes)}|${garmentUrl}|${model}|p7`);
  const { data: hit } = await tdb.from("results").select("id, result_path").eq("store_id", storeId).eq("cache_key", cacheKey).eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (hit?.result_path) {
    const { data: s } = await admin.storage.from("tryon-results").createSignedUrl(hit.result_path, 3600);
    if (s?.signedUrl) return json({ ok: true, cached: true, result_id: hit.id, url: s.signedUrl });
  }

  const { data: rsv, error: rsvErr } = await tdb.rpc("reserve_generation", { p_store: storeId, p_session: session });
  if (rsvErr) { console.error("reserve_generation", rsvErr.message); return json({ error: "internal" }, 500); }
  if (!rsv?.allowed) {
    const reason = String(rsv?.reason ?? "not_allowed");
    return json({ error: reason }, reason.endsWith("_reached") ? 429 : 403);
  }

  let resultId: string | null = null;
  const fail = async (msg: string, status = 502) => {
    console.error('tryon-generate fail:', msg);
    await tdb.rpc("release_generation", { p_store: storeId });
    if (resultId) await tdb.from("results").update({ status: "failed", error: msg.slice(0, 300), completed_at: new Date().toISOString() }).eq("id", resultId);
    return json({ error: "generation_failed" }, status);
  };

  try {
    const retention = Number(st.photo_retention_days ?? 30);
    const expires = new Date(Date.now() + retention * 86400_000).toISOString();
    const photoPath = `${storeId}/${crypto.randomUUID()}.${extOf(photo.mime)}`;

    const up = await admin.storage.from("tryon-photos").upload(photoPath, photo.bytes, { contentType: photo.mime, upsert: false });
    if (up.error) return await fail(`upload_photo: ${up.error.message}`, 500);

    const { data: ph, error: phErr } = await tdb.from("user_photos").insert({
      store_id: storeId, session_id: session, storage_path: photoPath,
      consent_at: new Date().toISOString(), consent_version: consentVersion, expires_at: expires,
    }).select("id").single();
    if (phErr || !ph) return await fail(`user_photos: ${phErr?.message}`, 500);

    await tdb.from("results").delete().eq("store_id", storeId).eq("cache_key", cacheKey).neq("status", "done");
        const { data: rs, error: rsErr } = await tdb.from("results").insert({
      store_id: storeId, photo_id: ph.id, product_id: productId, status: "processing",
      provider: "gemini", model, source_image_url: garmentUrl, cache_key: cacheKey,
    }).select("id").single();
    if (rsErr || !rs) return await fail(`results: ${rsErr?.message}`, 500);
    resultId = rs.id;

    const res = await fetch(`${API}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      signal: AbortSignal.timeout(55000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: PROMPT },
          { text: "Image 1 (CUSTOMER - keep this person):" },
          { inlineData: { mimeType: photo.mime, data: encodeBase64(photo.bytes) } },
          { text: "Image 2 (GARMENT reference only - ignore the person in it):" },
          { inlineData: { mimeType: garment.mime, data: encodeBase64(garment.bytes) } },
        ] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.4 },
      }),
    });
    if (!res.ok) return await fail(`gemini ${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 200)}`);

    const j = await res.json().catch(() => null);
    const parts: any[] = j?.candidates?.[0]?.content?.parts ?? [];
    const img = parts.map((p) => p?.inlineData ?? p?.inline_data).find((d) => d?.data);
    if (!img) return await fail(`sem_imagem finish=${j?.candidates?.[0]?.finishReason ?? j?.promptFeedback?.blockReason ?? "?"}`);

    const outMime = String(img.mimeType ?? img.mime_type ?? "image/png");
    const outPath = `${storeId}/${resultId}.${extOf(outMime)}`;
    const upR = await admin.storage.from("tryon-results").upload(outPath, decodeBase64(img.data), { contentType: outMime, upsert: true });
    if (upR.error) return await fail(`upload_result: ${upR.error.message}`, 500);

    const usage = j?.usageMetadata ?? {};
    const pt = Number(usage.promptTokenCount ?? 0);
    const tt = Number(usage.totalTokenCount ?? 0);
    const ct = tt > pt ? tt - pt : Number(usage.candidatesTokenCount ?? 0);
    const { data: price } = await admin.from("noah_models").select("input_usd, output_usd").eq("model", model).maybeSingle();
    const cost = (pt * Number(price?.input_usd ?? 0.3) + ct * Number(price?.output_usd ?? 30)) / 1_000_000;

    await tdb.from("results").update({ status: "done", result_path: outPath, cost_usd: cost, completed_at: new Date().toISOString() }).eq("id", resultId);
    await tdb.rpc("add_cost", { p_store: storeId, p_cost: cost });
    const { error: lu } = await admin.schema("noah").rpc("log_usage", {
      p_store_id: storeId, p_purpose: "tryon", p_model: model, p_prompt: pt, p_completion: ct, p_source: "tryon-generate",
    });
    if (lu) console.error("noah.log_usage", lu.message);

    const { data: s } = await admin.storage.from("tryon-results").createSignedUrl(outPath, 3600);
    return json({ ok: true, cached: false, result_id: resultId, url: s?.signedUrl ?? null });
  } catch (e) {
    return await fail(`exception: ${(e as Error).message}`);
  }
});

