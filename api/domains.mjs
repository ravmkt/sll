import { createClient } from "@supabase/supabase-js";

const TOKEN = process.env.SLL_VERCEL_TOKEN;
const PROJECT = process.env.SLL_VERCEL_PROJECT_ID;
const TEAM = process.env.SLL_VERCEL_TEAM_ID;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

async function vercel(path, method = "GET", body) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (TEAM) url.searchParams.set("teamId", TEAM);
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

function isApex(domain) {
  const p = domain.split(".");
  if (p.length <= 2) return true;
  return p.length === 3 && p[2] === "br" && ["com", "net", "org", "gov", "edu"].includes(p[1]);
}

async function inspect(admin, storeId, row) {
  const domain = row.domain;
  const enc = encodeURIComponent(domain);
  let pd = await vercel(`/v9/projects/${PROJECT}/domains/${enc}`);
  if (pd.ok && !pd.data.verified) {
    const v = await vercel(`/v9/projects/${PROJECT}/domains/${enc}/verify`, "POST");
    if (v.ok && typeof v.data.verified === "boolean") pd = v;
  }
  const cfg = await vercel(`/v6/domains/${enc}/config`);
  const configured = pd.ok && pd.data.verified === true && cfg.ok && cfg.data.misconfigured === false;
  const status = configured ? "verified" : "pending";

  if (status !== row.status) {
    await admin
      .from("store_domains")
      .update({ status, verified_at: configured ? new Date().toISOString() : null })
      .eq("store_id", storeId)
      .eq("domain", domain);
  }

  const cnames = cfg.data?.recommendedCNAME || [];
  const cname = (cnames.find((x) => x.rank === 1) || cnames[0])?.value?.replace(/\.$/, "") || "cname.vercel-dns.com";
  const ips = cfg.data?.recommendedIPv4 || [];
  const ipv4 = (ips.find((x) => x.rank === 1) || ips[0])?.value?.[0] || "76.76.21.21";

  return {
    domain,
    status,
    configured,
    apex: isApex(domain),
    cname,
    ipv4,
    verification: pd.data?.verification || [],
    inProject: pd.ok,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!TOKEN || !PROJECT || !SERVICE || !SB_URL || !SB_ANON) {
    return res.status(500).json({ error: "Variáveis de ambiente ausentes" });
  }

  const auth = req.headers.authorization || "";
  const { action, store_id: storeId } = req.body || {};
  const domain = String(req.body?.domain || "").trim().toLowerCase();
  if (!auth.startsWith("Bearer ") || !storeId) return res.status(401).json({ error: "Não autorizado" });

  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: store } = await userClient.from("stores").select("id").eq("id", storeId).maybeSingle();
  if (!store) return res.status(403).json({ error: "Sem permissão nesta loja" });

  const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });

  try {
    if (action === "add") {
      if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: "Domínio inválido" });
      if (domain === "sllhub.com.br" || domain.endsWith(".sllhub.com.br")) {
        return res.status(400).json({ error: "Domínio reservado do SLL" });
      }
      const { data: ex } = await admin.from("store_domains").select("store_id").eq("domain", domain).maybeSingle();
      if (ex && ex.store_id !== storeId) return res.status(409).json({ error: "Domínio já usado por outra loja" });

      if (!ex) {
        const { error } = await admin.from("store_domains").insert({ store_id: storeId, domain, status: "pending" });
        if (error) return res.status(400).json({ error: error.message });
      }
      const a = await vercel(`/v10/projects/${PROJECT}/domains`, "POST", { name: domain });
      if (!a.ok && a.data?.error?.code !== "domain_already_in_project") {
        if (!ex) await admin.from("store_domains").delete().eq("store_id", storeId).eq("domain", domain);
        return res.status(400).json({ error: a.data?.error?.message || "Falha ao adicionar o domínio" });
      }
    }

    if (action === "remove") {
      const { data: row } = await admin
        .from("store_domains").select("domain").eq("store_id", storeId).eq("domain", domain).maybeSingle();
      if (!row) return res.status(404).json({ error: "Domínio não encontrado" });
      await vercel(`/v9/projects/${PROJECT}/domains/${encodeURIComponent(domain)}`, "DELETE");
      await admin.from("store_domains").delete().eq("store_id", storeId).eq("domain", domain);
    }

    const { data: rows } = await admin
      .from("store_domains").select("domain, status").eq("store_id", storeId).order("domain");
    const domains = await Promise.all((rows || []).map((r) => inspect(admin, storeId, r)));
    return res.status(200).json({ domains });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Erro interno" });
  }
}
