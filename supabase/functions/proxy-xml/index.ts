import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_BYTES = 25 * 1024 * 1024;

function blockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h.includes(":")) return /^(::1?$|fe80|fc|fd)/.test(h);
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = +m[1], b = +m[2];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Não autorizado." }, 401);

    let raw = new URL(req.url).searchParams.get("url");
    if (!raw && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      raw = body?.url ?? null;
    }
    if (!raw) return json({ error: "O parâmetro url é obrigatório." }, 400);

    let current: URL;
    try { current = new URL(raw); } catch { return json({ error: "A URL informada é inválida." }, 400); }

    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      if (!["http:", "https:"].includes(current.protocol)) return json({ error: "A URL precisa utilizar HTTP ou HTTPS." }, 400);
      if (blockedHost(current.hostname)) return json({ error: "Endereço não permitido." }, 400);
      res = await fetch(current.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(25000),
        headers: { Accept: "application/xml,text/xml,text/plain,*/*", "User-Agent": "Mozilla/5.0 SLL XML Feed Proxy" },
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, current); continue; }
      break;
    }
    if (!res) return json({ error: "Falha ao baixar o XML." }, 502);
    if (res.status >= 300 && res.status < 400) return json({ error: "Redirecionamentos demais." }, 502);
    if (!res.ok) return json({ error: `O servidor do XML respondeu com HTTP ${res.status}.` }, 502);

    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return json({ error: "O XML excede 25 MB." }, 413);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return json({ error: "O XML excede 25 MB." }, 413);

    return new Response(new TextDecoder("utf-8").decode(buf), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("Erro no proxy XML:", error);
    return json({ error: error instanceof Error ? error.message : "Erro desconhecido ao baixar o XML." }, 500);
  }
});