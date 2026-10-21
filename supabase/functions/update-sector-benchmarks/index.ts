import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODELS = [...new Set([Deno.env.get("GEMINI_MODEL") ?? "gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"])];
const API = "https://generativelanguage.googleapis.com/v1beta";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Row = Record<string, any>;

// Faixa plausivel por metrica (anti-anomalia) e variacao maxima aceita sobre o valor atual
const METRICS = [
  { key: "conversion", label: "conversão", min: "conversion_rate_min", max: "conversion_rate_max", lo: 0.2, hi: 8 },
  { key: "video_ctr", label: "CTR do vídeo", min: "video_ctr_min", max: "video_ctr_max", lo: 0.5, hi: 20 },
  { key: "retention_5s", label: "retenção 5s", min: "retention_5s_min", max: "retention_5s_max", lo: 15, hi: 90 },
  { key: "add_to_cart", label: "add to cart", min: "add_to_cart_min", max: "add_to_cart_max", lo: 1, hi: 25 },
  { key: "ticket", label: "ticket médio", min: "ticket_avg_min", max: "ticket_avg_max", lo: 30, hi: 5000 },
  { key: "cart_abandonment", label: "abandono de carrinho", min: "cart_abandonment_min", max: "cart_abandonment_max", lo: 40, hi: 95 },
] as const;
const MAX_SWING = 0.4;
const BATCH = 6;

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

function toRange(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const a = Number(v[0]);
  const b = Number(v[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || a > b) return null;
  return [a, b];
}

function parseJson(text: string): Record<string, any> | null {
  const i = text.indexOf("{");
  const j = text.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(text.slice(i, j + 1)); } catch { return null; }
}

function buildPrompt(name: string, year: number, cur?: Row): string {
  const atual: Record<string, unknown> = {};
  if (cur) for (const m of METRICS) if (cur[m.min] != null) atual[m.key] = [Number(cur[m.min]), Number(cur[m.max])];
  return `Você é analista de e-commerce no Brasil. Use a busca na web para encontrar dados PUBLICADOS e recentes (${year} ou ${year - 1}) de benchmarks do e-commerce brasileiro para o setor "${name}".
Fontes aceitas: Nuvemshop, Webshoppers/NIQ Ebit, Neotrust, ABComm, Shopify, Statista, Google, Meta.
Valores atuais da nossa base (referência; só altere com evidência): ${JSON.stringify(atual)}.
Responda SOMENTE com um JSON, sem texto fora dele, neste formato:
{"conversion":[min,max],"video_ctr":[min,max],"retention_5s":[min,max],"add_to_cart":[min,max],"ticket":[min,max],"cart_abandonment":[min,max],"notes":"resumo curto"}
Regras: percentuais como número (2.5 significa 2,5%); ticket em reais (BRL); use null para a métrica que não tiver fonte confiável; não invente números.`;
}

let START = Date.now();
let modelCache: string[] | null = null;

async function listModels(): Promise<string[]> {
  if (modelCache) return modelCache;
  const pref = [Deno.env.get("GEMINI_MODEL") ?? "", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"].filter(Boolean);
  let avail: string[] = [];
  try {
    const res = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": GEMINI_KEY } });
    if (res.ok) {
      const j = await res.json();
      avail = ((j.models ?? []) as any[])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => String(m.name).replace(/^models\//, ""))
        .filter((id) => /^gemini-/.test(id) && /flash/.test(id) && !/(tts|image|embedding|live|audio|robotics|computer-use|thinking|exp)/.test(id));
    }
  } catch { /* usa a lista padrao */ }
  const ordered = avail.length ? [...pref.filter((p) => avail.includes(p)), ...avail.sort().reverse()] : pref;
  modelCache = [...new Set(ordered)].slice(0, 3);
  return modelCache;
}

async function askGemini(prompt: string) {
  const errs: string[] = [];
  for (const m of await listModels()) {
    if (Date.now() - START > 110000) { errs.push("prazo global excedido"); break; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 35000);
    try {
      const res = await fetch(`${API}/models/${m}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1 },
        }),
      });
      if (!res.ok) { errs.push(`${m} ${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 140)}`); continue; }
      const j = await res.json();
      const cand = j?.candidates?.[0];
      const text = (cand?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
      const sources = ((cand?.groundingMetadata?.groundingChunks ?? []) as any[])
        .map((ch) => String(ch?.web?.title ?? "").trim())
        .filter(Boolean);
      return { text, sources: [...new Set(sources)], model: m };
    } catch (e) {
      errs.push(`${m} ${(e as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Gemini falhou: ${errs.join(" | ")}`);
}

async function processSector(s: any, cur: Row | undefined, year: number, nowIso: string) {
  const rejected: { sector: string; reason: string }[] = [];
  let ans;
  try {
    ans = await askGemini(buildPrompt(s.name, year, cur));
  } catch (e) {
    return { failed: { sector: s.name, reason: (e as Error).message }, rejected };
  }
  const data = parseJson(ans.text);
  if (!data) return { failed: { sector: s.name, reason: "Resposta da IA fora do formato JSON" }, rejected };
  if (ans.sources.length === 0) return { failed: { sector: s.name, reason: "Resposta sem fontes web" }, rejected };

  const row: Row = { ...(cur ?? {}), sector_id: s.id, sector_name: s.name };
  let changed = 0;
  let deltaConv: number | null = null;

  for (const m of METRICS) {
    const r = toRange(data[m.key]);
    if (!r) continue;
    if (r[0] < m.lo || r[1] > m.hi) {
      rejected.push({ sector: s.name, reason: `${m.label}: ${r[0]} a ${r[1]} fora da faixa plausível` });
      continue;
    }
    const oMin = num(cur?.[m.min]);
    const oMax = num(cur?.[m.max]);
    if (oMin !== null && oMax !== null && oMin + oMax > 0) {
      const oldMid = (oMin + oMax) / 2;
      const newMid = (r[0] + r[1]) / 2;
      const swing = Math.abs(newMid - oldMid) / oldMid;
      if (swing > MAX_SWING) {
        rejected.push({ sector: s.name, reason: `${m.label}: variação de ${(swing * 100).toFixed(0)}% acima do limite de ${MAX_SWING * 100}%` });
        continue;
      }
      if (m.key === "conversion") deltaConv = newMid - oldMid;
    }
    row[m.min] = r[0];
    row[m.max] = r[1];
    changed++;
  }
  if (changed === 0) return { rejected, skipped: s.name };

  row.source_reference = `Gemini + Google Search (${year}): ${ans.sources.slice(0, 5).join(", ")}`.slice(0, 400);
  row.updated_at = nowIso;
  return { row, deltaConv, rejected, sector: s.name };
}

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
  if (!GEMINI_KEY) return json({ error: "IA_NAO_CONFIGURADA" }, 500);
  START = Date.now();

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const [{ data: sectors, error: e1 }, { data: current, error: e2 }] = await Promise.all([
    admin.from("sectors").select("id, name, slug").order("display_order"),
    admin.from("sector_benchmarks").select("*"),
  ]);
  if (e1 || e2) return json({ error: "DB_ERROR", details: (e1 ?? e2)!.message }, 500);

  const curBySector = new Map<string, Row>((current ?? []).map((r: Row) => [r.sector_id, r]));
  const year = new Date().getFullYear();
  const nowIso = new Date().toISOString();
  const list = sectors ?? [];

  const ok: any[] = [];
  const failed: { sector: string; reason: string }[] = [];
  const rejected: { sector: string; reason: string }[] = [];
  const unchanged: string[] = [];

  for (let i = 0; i < list.length; i += BATCH) {
    const out = await Promise.all(list.slice(i, i + BATCH).map((s: any) => processSector(s, curBySector.get(s.id), year, nowIso)));
    for (const r of out) {
      rejected.push(...r.rejected);
      if ("failed" in r && r.failed) failed.push(r.failed);
      else if ("skipped" in r && r.skipped) unchanged.push(r.skipped);
      else if ("row" in r && r.row) ok.push(r);
    }
  }

  if (!dryRun && ok.length > 0) {
    const rows = ok.map((r) => r.row);
    const { error: upErr } = await admin.from("sector_benchmarks").upsert(rows, { onConflict: "sector_id" });
    if (upErr) return json({ error: "UPSERT_ERROR", details: upErr.message }, 500);

    const hist = rows.map((r: Row) => {
      const h: Row = { sector_id: r.sector_id, sector_name: r.sector_name, year, source_reference: r.source_reference, updated_at: nowIso };
      for (const m of METRICS) { h[m.min] = r[m.min] ?? null; h[m.max] = r[m.max] ?? null; }
      return h;
    });
    const { error: hErr } = await admin.from("sector_benchmarks_history").upsert(hist, { onConflict: "sector_id,year" });
    if (hErr) return json({ error: "HISTORY_ERROR", details: hErr.message }, 500);
  }

  const deltas = ok.map((r) => r.deltaConv).filter((d): d is number => typeof d === "number");
  const avg = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)} p.p.`;
  const moda = ok.find((r) => norm(r.sector).includes("moda"));
  const summary = ok.length === 0
    ? "Nenhum setor foi atualizado: a IA não trouxe dados com fonte ou os valores foram rejeitados pela validação."
    : `Benchmarks ${year} ${dryRun ? "simulados" : "atualizados"} com base em dados de mercado (${ok.length} de ${list.length} setores). Variação média de ${fmt(avg)} em conversão` +
      (moda && typeof moda.deltaConv === "number" ? `; Moda e Acessórios: ${fmt(moda.deltaConv)}.` : ".");

  console.log("update-sector-benchmarks", JSON.stringify({ dryRun, updated: ok.length, failed: failed.length, rejected: rejected.length }));
  return json({ dry_run: dryRun, year, updated: ok.length, unchanged, failed, rejected, summary, updated_at: nowIso });
});