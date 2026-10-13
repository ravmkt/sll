import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const DEFAULT_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.1-flash-lite";
const API = "https://generativelanguage.googleapis.com/v1beta";
const PRICING_URL = "https://ai.google.dev/gemini-api/docs/pricing";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function gemini(models: string[], body: unknown): Promise<string> {
  let last = "";
  for (const m of models) {
    const res = await fetch(`${API}/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      return String(d?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "").trim();
    }
    last = `${m}: ${res.status} ${(await res.text()).slice(0, 160)}`;
    if (res.status !== 404 && res.status !== 429 && res.status < 500) break;
  }
  throw new Error(`Gemini falhou (${last})`);
}

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!GEMINI_KEY) return json({ error: "IA_NAO_CONFIGURADA" }, 500);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: u } = await asUser.auth.getUser();
  if (!u?.user) return json({ error: "NAO_AUTENTICADO" }, 401);
  const { data: isMaster } = await asUser.rpc("noah_is_master");
  if (isMaster !== true) return json({ error: "FORBIDDEN" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: cfg } = await admin.from("noah_settings").select("model").eq("id", 1).maybeSingle();
  const models = [...new Set([cfg?.model || DEFAULT_MODEL, DEFAULT_MODEL, "gemini-2.5-flash-lite"])];

  try {
    if (action === "list_models") {
      const out: { model: string; label: string }[] = [];
      let token = "";
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${API}/models?pageSize=200${token ? `&pageToken=${token}` : ""}`, {
          headers: { "x-goog-api-key": GEMINI_KEY },
        });
        if (!res.ok) return json({ error: `Google respondeu ${res.status}` }, 502);
        const d = await res.json();
        for (const m of d.models ?? []) {
          if (!(m.supportedGenerationMethods ?? []).includes("generateContent")) continue;
          const id = String(m.name ?? "").replace(/^models\//, "");
          if (!/^gemini-/.test(id) || /(tts|image|embedding|live|audio|robotics|computer-use)/.test(id)) continue;
          out.push({ model: id, label: String(m.displayName || id) });
        }
        token = d.nextPageToken ?? "";
        if (!token) break;
      }
      out.sort((a, b) => a.model.localeCompare(b.model));
      return json({ models: out });
    }

    if (action === "check_price") {
      const model = String(body?.model ?? "").trim();
      if (!/^[a-z0-9][a-z0-9.\-]{2,80}$/i.test(model)) return json({ error: "MODELO_INVALIDO" }, 400);
      const res = await fetch(PRICING_URL, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SLLBot/1.0)", "Accept-Language": "en" } });
      if (!res.ok) return json({ error: `A página de preços respondeu ${res.status}` }, 502);
      const text = (await res.text())
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ");
      const re = new RegExp(model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w-]|\\.\\d)", "gi");
      const hits: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) && hits.length < 2) hits.push(text.slice(Math.max(0, m.index - 200), m.index + 3500));
      if (!hits.length) return json({ error: "Modelo não encontrado na página de preços do Google. Edite o preço manualmente." }, 404);

      const raw = await gemini(models, {
        contents: [{
          role: "user",
          parts: [{
            text:
              `Do trecho abaixo da página de preços do Google, extraia o preço do modelo "${model}" na camada Standard paga, ` +
              `para texto/imagem/vídeo (ignore áudio, cache, batch e flex), em dólares por 1 milhão de tokens. ` +
              `Se houver faixas por tamanho de prompt, use a de até 200 mil tokens. ` +
              `Responda só JSON: {"found":boolean,"input_usd":number,"output_usd":number}. Se não tiver certeza, found=false.\n\nTRECHO:\n` +
              hits.join("\n...\n"),
          }],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 800, responseMimeType: "application/json" },
      });
      let j: any = null;
      try { j = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { j = null; }
      const i = Number(j?.input_usd);
      const o = Number(j?.output_usd);
      if (!j?.found || !isFinite(i) || !isFinite(o) || i <= 0 || o <= 0) {
        return json({ error: "Não consegui ler o preço desse modelo na página. Edite manualmente." }, 404);
      }
      return json({ input_usd: i, output_usd: o, url: PRICING_URL });
    }

    if (action === "extract_doc") {
      const ext = String(body?.ext ?? "").toLowerCase();
      const b64 = String(body?.data ?? "");
      if (!b64 || b64.length > 12_000_000) return json({ error: "Arquivo vazio ou acima de 8 MB." }, 413);

      if (ext === "docx") {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const zip = await JSZip.loadAsync(bytes);
        const xml = await zip.file("word/document.xml")?.async("string");
        if (!xml) return json({ error: "DOCX inválido." }, 400);
        const text = decode(
          xml.replace(/<w:tab\/>/g, "\t").replace(/<w:br[^>]*\/>/g, "\n").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, ""),
        ).replace(/\n{3,}/g, "\n\n").trim();
        return json({ text });
      }

      if (ext === "pdf") {
        const text = await gemini(models, {
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: b64 } },
              { text: "Transcreva todo o texto deste documento em português, em markdown simples, preservando títulos, listas e passo a passo. Não resuma e não comente." },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 32000 },
        });
        return json({ text });
      }
      return json({ error: "Formato não suportado." }, 400);
    }

    return json({ error: "ACAO_INVALIDA" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});