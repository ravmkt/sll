import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const EVO = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const WH_SECRET = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";
const SCHEMA = Deno.env.get("NOTIFY_SCHEMA") ?? "live_commerce";

async function evo(path: string, method: string, key: string, body?: unknown) {
  const r = await fetch(`${EVO}${path}`, {
    method,
    headers: { apikey: key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let data: any = null;
  try { data = JSON.parse(t); } catch { data = { raw: t.slice(0, 300) }; }
  return { ok: r.ok, status: r.status, data };
}

const norm = (b?: string | null) => (!b ? null : b.startsWith("data:") ? b : `data:image/png;base64,${b}`);

const setWebhook = (n: string, t: string) =>
  evo(`/webhook/set/${n}`, "POST", t, {
    webhook: {
      enabled: true,
      url: `${SB_URL}/functions/v1/live_notify_webhook`,
      webhookByEvents: false,
      webhookBase64: false,
      headers: { Authorization: `Bearer ${ANON}`, ...(WH_SECRET ? { "x-webhook-secret": WH_SECRET } : {}) },
      events: ["MESSAGES_UPSERT"],
    },
  }).catch(() => null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!EVO || !EVO_KEY) return json({ error: "Evolution não configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY)." }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SB_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Não autenticado." }, 401);

    const { action, store_id } = await req.json();
    if (!store_id) return json({ error: "store_id obrigatório." }, 400);

    const admin = createClient(SB_URL, SRK);
    const { data: st } = await admin.from("stores").select("id, owner_user_id").eq("id", store_id).maybeSingle();
    if (!st || st.owner_user_id !== u.user.id) return json({ error: "Loja inválida." }, 403);

    const db = admin.schema(SCHEMA);
    const { data: cfg } = await db.from("live_notify_settings").select("*").eq("store_id", store_id).maybeSingle();
    let exists = !!cfg;
    let name = (cfg?.evolution_instance as string | null) ?? null;
    let token = (cfg?.evolution_token as string | null) ?? null;

    const save = async (patch: Record<string, unknown>) => {
      const r = exists
        ? await db.from("live_notify_settings").update(patch).eq("store_id", store_id)
        : await db.from("live_notify_settings").insert({ store_id, ...patch });
      if (r.error) throw new Error(r.error.message);
      exists = true;
    };

    const getState = async (n: string, t: string) => {
      const r = await evo(`/instance/connectionState/${n}`, "GET", t);
      if (!r.ok && (r.status === 404 || r.status === 401)) {
        await save({ evolution_instance: null, evolution_token: null, evolution_status: "disconnected", evolution_number: null });
        return { state: "none" as const };
      }
      const open = r.data?.instance?.state === "open" || r.data?.state === "open";
      if (open) {
        let num = (cfg?.evolution_number as string | null) ?? null;
        if (!num) {
          const f = await evo(`/instance/fetchInstances?instanceName=${n}`, "GET", EVO_KEY);
          const it = Array.isArray(f.data) ? f.data[0] : f.data;
          const jid = it?.ownerJid ?? it?.instance?.owner ?? it?.number ?? "";
          num = String(jid).split("@")[0] || null;
        }
        if (cfg?.evolution_status !== "connected" || !cfg?.evolution_number) {
          await save({ evolution_status: "connected", evolution_number: num, evolution_connected_at: new Date().toISOString() });
        }
        return { state: "connected" as const, number: num };
      }
      if (cfg?.evolution_status === "connected") await save({ evolution_status: "disconnected" });
      return { state: "connecting" as const };
    };

    if (action === "status") {
      if (!name || !token) return json({ state: "none" });
      return json(await getState(name, token));
    }

    if (action === "connect") {
      if (name && token) {
        const s = await getState(name, token);
        if (s.state === "connected") return json(s);
        if (s.state === "connecting") {
          await setWebhook(name, token);
          const c = await evo(`/instance/connect/${name}`, "GET", token);
          return json({ state: "connecting", qr: norm(c.data?.base64) });
        }
        name = null;
        token = null;
      }
      const newName = `sll_${String(store_id).replace(/-/g, "").slice(0, 12)}`;
      const c = await evo("/instance/create", "POST", EVO_KEY, {
        instanceName: newName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      });
      const tok = typeof c.data?.hash === "string" ? c.data.hash : c.data?.hash?.apikey;
      if (!c.ok || !tok) {
        return json({ error: `Evolution recusou a criação (HTTP ${c.status}). Se a instância ${newName} já existe lá, apague-a no painel da Evolution.` }, 502);
      }
      await save({ evolution_instance: newName, evolution_token: tok, evolution_status: "connecting" });
      await setWebhook(newName, tok);
      let qr = norm(c.data?.qrcode?.base64);
      if (!qr) {
        const q = await evo(`/instance/connect/${newName}`, "GET", tok);
        qr = norm(q.data?.base64);
      }
      return json({ state: "connecting", qr });
    }

    if (action === "logout") {
      if (name && token) await evo(`/instance/logout/${name}`, "DELETE", token);
      await save({ evolution_status: "disconnected", evolution_number: null });
      return json({ state: "connecting" });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});