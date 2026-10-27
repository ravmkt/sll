import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVO_URL = (Deno.env.get("EVOLUTION_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
const SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";

const db = createClient(SB_URL, SB_KEY, { db: { schema: "live_commerce" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const OPTOUT = "Para não receber mais avisos, responda SAIR";
const REQUIRED = ["{nome}", "{titulo_live}", "{link_live}"];
const BUDGET_MS = 100_000;
const DELAY_MIN = 5;
const DELAY_MAX = 12;

const DEFAULTS: Record<string, { subject: string; body: string }> = {
  "24h": { subject: "Amanhã tem live: {titulo_live}", body: "Olá, {nome}! 👋\nA live \"{titulo_live}\" começa em {data}.\nEntre por aqui: {link_live}" },
  on_air: { subject: "Estamos no ar: {titulo_live}", body: "Olá, {nome}! 🔴\nA live \"{titulo_live}\" começou agora.\nEntre por aqui: {link_live}" },
};

const pick = (o: any, keys: string[]) => { for (const k of keys) if (o?.[k] != null && o[k] !== "") return o[k]; return null; };
const enabled = (s: any, ch: string, tr: string) =>
  !!(s?.[`${ch}_${tr}`] ?? s?.[`${tr}_${ch}`] ?? s?.rules?.[ch]?.[tr] ?? s?.[`${ch}_${tr === "24h" ? "24h" : "on_air"}`]);

function normPhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 13 ? d : null;
}

function render(tpl: string, v: Record<string, string>) {
  return tpl.replace(/\{(nome|titulo_live|link_live|data)\}/g, (_m, k) => v[k] ?? "");
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-internal-secret") !== SECRET) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const dry = body?.dry === true;
  const t0 = Date.now();
  const out: any[] = [];

  const now = new Date();
  const in24 = new Date(now.getTime() + 24 * 3600e3);
  const jobs: { live: any; trigger: "24h" | "on_air" }[] = [];

  const { data: soon } = await db.from("lives").select("*")
    .not("status", "in", "(live,ended,finished,cancelled)")
    .gt("scheduled_at", now.toISOString()).lte("scheduled_at", in24.toISOString());
  for (const l of soon ?? []) jobs.push({ live: l, trigger: "24h" });
  const { data: air } = await db.from("lives").select("*").eq("status", "live");
  for (const l of air ?? []) jobs.push({ live: l, trigger: "on_air" });

  let stop = false;
  for (const { live, trigger } of jobs) {
    if (stop) break;
    const storeId = live.store_id;
    const { data: settings } = await db.from("live_notify_settings").select("*").eq("store_id", storeId).maybeSingle();
    const { data: tpls } = await db.from("live_notify_templates").select("*").eq("store_id", storeId);
    const { data: inst } = await db.from("store_whatsapp_instances").select("*").eq("store_id", storeId).maybeSingle();
    const { data: leads } = await db.from("live_leads").select("*").eq("live_id", live.id).or("unsubscribed.is.null,unsubscribed.eq.false");
    if (!leads?.length) continue;

    const link = String(pick(live, ["public_url", "share_url"]) ?? `${APP_URL}/live/${live.id}`);
    const when = live.scheduled_at
      ? new Date(live.scheduled_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
      : "agora";

    for (const channel of ["whatsapp", "email"] as const) {
      if (stop) break;
      if (!enabled(settings, channel, trigger)) continue;

      const row = (tpls ?? []).find((t: any) => t.channel === channel && (t.trigger === trigger || t.trigger_type === trigger));
      let text = String(pick(row, ["body", "message", "content", "text"]) ?? DEFAULTS[trigger].body);
      const subject = String(pick(row, ["subject", "title"]) ?? DEFAULTS[trigger].subject);

      if (channel === "whatsapp") {
        const missing = REQUIRED.filter((v) => !text.includes(v));
        if (missing.length) { out.push({ live: live.id, channel, trigger, skipped: "TEMPLATE_SEM_VARIAVEIS", missing }); continue; }
        if (!inst || !["open", "connected"].includes(String(inst.status))) { out.push({ live: live.id, channel, trigger, skipped: "WHATSAPP_DESCONECTADO" }); continue; }
        if (!text.includes("responda SAIR")) text += `\n\n${OPTOUT}`;
      }

      for (const lead of leads) {
        if (Date.now() - t0 > BUDGET_MS) { stop = true; break; }
        const vars = { nome: String(pick(lead, ["name", "nome"]) ?? "").trim().split(" ")[0] || "tudo bem", titulo_live: String(live.title ?? "Live"), link_live: link, data: when };
        const to = channel === "whatsapp" ? normPhone(pick(lead, ["whatsapp", "phone", "telefone"])) : String(pick(lead, ["email"]) ?? "").trim();
        if (!to) continue;

        const { data: ex } = await db.from("live_notification_logs").select("id").eq("lead_id", lead.id).eq("live_id", live.id).eq("channel", channel).eq("trigger", trigger).maybeSingle();
        if (ex) continue;
        if (dry) { out.push({ live: live.id, lead: lead.id, channel, trigger, to, preview: render(text, vars), dry_run: true }); continue; }

        const { error: ce } = await db.from("live_notification_logs").insert({ store_id: storeId, lead_id: lead.id, live_id: live.id, channel, trigger, status: "sending" });
        if (ce) { if (ce.code !== "23505") out.push({ lead: lead.id, error: ce.message }); continue; }

        let ok = false, err = "";
        try {
          if (channel === "whatsapp") {
            const r = await fetch(`${EVO_URL}/message/sendText/${inst.instance_name}`, {
              method: "POST",
              headers: { apikey: inst.instance_token || EVO_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ number: to, text: render(text, vars) }),
            });
            ok = r.ok; if (!ok) err = `Evolution HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`;
          } else {
            const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b">${esc(render(text, vars)).replace(/\n/g, "<br>")}</div>`;
            const r = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: render(subject, vars), html }),
            });
            ok = r.ok; if (!ok) err = `Resend HTTP ${r.status}`;
          }
        } catch (e) { err = String((e as Error)?.message || e); }

        await db.from("live_notification_logs").update({ status: ok ? "sent" : "failed", error: err || null, sent_at: new Date().toISOString() })
          .eq("lead_id", lead.id).eq("live_id", live.id).eq("channel", channel).eq("trigger", trigger);
        out.push({ live: live.id, lead: lead.id, channel, trigger, sent: ok, error: err || undefined });

        if (channel === "whatsapp") await sleep(rnd(DELAY_MIN, DELAY_MAX) * 1000);
      }
    }
  }
  return json({ dry_run: dry, processed: out.length, partial: stop, result: out });
});