import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const TYPES = ["view", "redirect", "bypass", "whatsapp_click"];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
const cut = (v: unknown, n = 500) => (typeof v === "string" ? v.slice(0, n) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return new Response("bad request", { status: 400, headers: cors }); }

  const gateId = String(b.gate_id || "");
  const type = String(b.event_type || "");
  if (!/^[0-9a-f-]{36}$/i.test(gateId) || !TYPES.includes(type)) {
    return new Response("bad request", { status: 400, headers: cors });
  }

  const utm: Record<string, string> = {};
  const src = (b.utm && typeof b.utm === "object" ? b.utm : {}) as Record<string, unknown>;
  for (const k of UTM_KEYS) if (typeof src[k] === "string") utm[k] = (src[k] as string).slice(0, 200);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    db: { schema: "gate" },
  });
  const { error } = await sb.from("gate_events").insert({
    gate_id: gateId,
    event_type: type,
    host: cut(b.host, 200),
    path: cut(b.path),
    referrer: cut(b.referrer),
    utm,
  });
  return new Response(null, { status: error ? 400 : 204, headers: cors });
});
