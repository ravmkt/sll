import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SOURCE = "Referência interna SLL (estimativa de mercado), revisão semestral";

// Base de referência. Para mudar valores, edite aqui e clique em "Atualizar Benchmarks de Mercado".
// slug, nome, conversao[min,max], ctr[min,max], retencao5s[min,max], addToCart[min,max], ticket[min,max]
const BASE: [string, string, number[], number[], number[], number[], number[]][] = [
  ["alimentos_bebidas",   "Alimentos e Bebidas",   [1.8, 2.8], [3.8, 6.0], [45, 58], [5.5, 8.0],  [140, 260]],
  ["artesanato",          "Artesanato",            [1.1, 1.7], [4.2, 6.8], [50, 65], [4.8, 7.5],  [90, 180]],
  ["beleza_cosmeticos",   "Beleza e Cosméticos",   [1.8, 2.9], [5.2, 8.5], [52, 68], [7.0, 11.2], [160, 280]],
  ["casa_decoracao",      "Casa e Decoração",      [1.0, 1.6], [3.8, 6.2], [42, 56], [4.5, 7.0],  [320, 680]],
  ["eletronicos",         "Eletrônicos e Gadgets", [0.8, 1.4], [3.0, 5.0], [38, 50], [3.8, 5.8],  [450, 1350]],
  ["esporte_lazer",       "Esporte e Lazer",       [1.2, 1.9], [4.0, 6.5], [46, 60], [5.0, 7.8],  [240, 450]],
  ["infantil_brinquedos", "Infantil e Brinquedos", [1.3, 2.1], [4.0, 6.4], [44, 58], [5.2, 8.2],  [190, 320]],
  ["joias_semijoias",     "Joias e Semijoias",     [1.2, 1.9], [5.0, 7.8], [54, 70], [6.5, 10.0], [180, 390]],
  ["moda_acessorios",     "Moda e Acessórios",     [1.4, 2.2], [4.5, 7.4], [48, 64], [6.0, 9.5],  [220, 380]],
  ["pet_shop",            "Pet Shop",              [1.7, 2.6], [4.2, 6.8], [46, 60], [5.8, 8.8],  [170, 290]],
  ["saude_suplementos",   "Saúde e Suplementos",   [1.6, 2.5], [4.4, 7.0], [45, 58], [5.5, 8.5],  [180, 340]],
  ["outros",              "Outros / Serviços",     [1.0, 1.6], [3.2, 5.2], [40, 52], [4.0, 6.2],  [200, 400]],
];

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  // Autorizacao: cron (segredo interno) ou super admin logado
  let allowed = INTERNAL_SECRET !== "" && req.headers.get("x-internal-secret") === INTERNAL_SECRET;
  if (!allowed) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth) {
      const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
      const { data: u } = await asUser.auth.getUser();
      if (u?.user) {
        const { data: ok } = await asUser.rpc("is_superadmin");
        allowed = ok === true;
      }
    }
  }
  if (!allowed) return json({ error: "FORBIDDEN" }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: sectors, error } = await admin.from("sectors").select("id, name, slug");
  if (error) return json({ error: "DB_ERROR", details: error.message }, 500);

  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  const missing: string[] = [];

  for (const [slug, name, c, k, r, a, t] of BASE) {
    const s = (sectors ?? []).find((x: any) => x.slug === slug || norm(x.name) === norm(name));
    if (!s) { missing.push(name); continue; }
    rows.push({
      sector_id: s.id, sector_name: s.name,
      conversion_rate_min: c[0], conversion_rate_max: c[1],
      video_ctr_min: k[0], video_ctr_max: k[1],
      retention_5s_min: r[0], retention_5s_max: r[1],
      add_to_cart_min: a[0], add_to_cart_max: a[1],
      ticket_avg_min: t[0], ticket_avg_max: t[1],
      source_reference: SOURCE, updated_at: now,
    });
  }

  const { error: upErr } = await admin.from("sector_benchmarks").upsert(rows, { onConflict: "sector_id" });
  if (upErr) return json({ error: "UPSERT_ERROR", details: upErr.message }, 500);

  console.log("update-sector-benchmarks", JSON.stringify({ updated: rows.length, missing }));
  return json({ updated: rows.length, missing, updated_at: now });
});
