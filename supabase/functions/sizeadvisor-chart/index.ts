import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });

const ORDER: Record<string, number> = { blusa: 1, calca: 2 };

type Row = { size: string; equiv: string | null; measures: Record<string, number[]> };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = new URL(req.url);
  const storeId = u.searchParams.get("store_id") ?? "";
  const pageUrl = ((u.searchParams.get("url") ?? u.searchParams.get("product") ?? "")).toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) return json({ error: "store_id invalido" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    db: { schema: "sizeadvisor" },
  });

  const { data: assigns, error: e1 } = await db
    .from("chart_assignments")
    .select("chart_id,match_type,match_value")
    .eq("store_id", storeId);
  if (e1) return json({ error: e1.message }, 500);

  const hits = (assigns ?? []).filter(
    (a) => a.match_type === "url_pattern" && pageUrl.includes(String(a.match_value).toLowerCase()),
  );
  const ids = [...new Set(hits.map((h) => h.chart_id))];
  if (!ids.length) return json({ gender: null, rows: [], charts: [] });

  const { data: charts, error: e3 } = await db
    .from("size_charts")
    .select("id,name,gender,category")
    .in("id", ids);
  if (e3) return json({ error: e3.message }, 500);

  const { data: rows, error: e2 } = await db
    .from("size_chart_rows")
    .select("chart_id,size_label,size_equiv,measure_key,min_cm,max_cm,sort_order")
    .in("chart_id", ids)
    .order("sort_order");
  if (e2) return json({ error: e2.message }, 500);

  const byChart = new Map<string, Map<string, Row>>();
  for (const r of rows ?? []) {
    if (!byChart.has(r.chart_id)) byChart.set(r.chart_id, new Map());
    const m = byChart.get(r.chart_id)!;
    if (!m.has(r.size_label)) m.set(r.size_label, { size: r.size_label, equiv: r.size_equiv ?? null, measures: {} });
    m.get(r.size_label)!.measures[r.measure_key] = [Number(r.min_cm), Number(r.max_cm)];
  }

  const out = (charts ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      gender: c.gender ?? "F",
      category: c.category,
      rows: [...(byChart.get(c.id)?.values() ?? [])],
    }))
    .sort((a, b) => (ORDER[a.category] ?? 9) - (ORDER[b.category] ?? 9));

  const { data: settings } = await db
    .from("widget_settings")
    .select("button_text,bg_color,text_color,border_color,radius,full_width,position,anchor_selector,modal_image_url,modal_image_fit,modal_image_position,show_modal_title,set_layout")
    .eq("store_id", storeId)
    .maybeSingle();
  return json({ gender: out[0]?.gender ?? "F", rows: out[0]?.rows ?? [], charts: out, settings: settings ?? {} });
});