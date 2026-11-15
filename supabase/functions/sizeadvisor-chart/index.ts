import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = new URL(req.url);
  const storeId = u.searchParams.get("store_id") ?? "";
  const pageUrl = (u.searchParams.get("url") ?? "").toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) return json({ error: "store_id invalido" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "sizeadvisor" } });

  const { data: assigns, error: e1 } = await db.from("chart_assignments").select("chart_id,match_type,match_value").eq("store_id", storeId);
  if (e1) return json({ error: e1.message }, 500);

  const hit = (assigns ?? []).find((a) => a.match_type === "url_pattern" && pageUrl.includes(String(a.match_value).toLowerCase()));
  if (!hit) return json({ gender: null, rows: [] });

  const { data: chart } = await db.from("size_charts").select("gender").eq("id", hit.chart_id).single();
  const { data: rows, error: e2 } = await db.from("size_chart_rows").select("size_label,measure_key,min_cm,max_cm,sort_order").eq("chart_id", hit.chart_id).order("sort_order");
  if (e2) return json({ error: e2.message }, 500);

  const map = new Map<string, { size: string; measures: Record<string, number[]> }>();
  for (const r of rows ?? []) {
    if (!map.has(r.size_label)) map.set(r.size_label, { size: r.size_label, measures: {} });
    map.get(r.size_label)!.measures[r.measure_key] = [Number(r.min_cm), Number(r.max_cm)];
  }
  return json({ gender: chart?.gender ?? "F", rows: [...map.values()] });
});
