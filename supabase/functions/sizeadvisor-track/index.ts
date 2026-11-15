import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const num = (v: unknown) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo invalido" }, 405);

  let p: Record<string, unknown> = {};
  try { p = await req.json(); } catch { return json({ error: "json invalido" }, 400); }

  const storeId = String(p.store_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) return json({ error: "store_id invalido" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "sizeadvisor" } });

  const { error } = await db.from("sessions").insert({
    store_id: storeId,
    anon_id: String(p.anon_id ?? "anon").slice(0, 64),
    product_ref: p.product_ref ? String(p.product_ref).slice(0, 300) : null,
    gender: p.gender ? String(p.gender).slice(0, 1) : null,
    height_cm: num(p.height_cm),
    weight_kg: num(p.weight_kg),
    age: num(p.age),
    fit_pref: num(p.fit_pref) ?? 0,
    recommended_size: p.recommended_size ? String(p.recommended_size).slice(0, 10) : null,
    selected_size: p.selected_size ? String(p.selected_size).slice(0, 10) : null,
    added_to_cart: p.added_to_cart === true,
  });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
