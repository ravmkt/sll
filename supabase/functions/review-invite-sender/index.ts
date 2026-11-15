import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") ?? Deno.env.get("EVOLUTION_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
const SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";

const db = createClient(SB_URL, SB_KEY);
const sdb = createClient(SB_URL, SB_KEY, { db: { schema: "streamsell" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pick = (o: any, keys: string[]) => { for (const k of keys) if (o?.[k] != null && o[k] !== "") return o[k]; return null; };
const isUrl = (u: unknown) => /^https?:\/\//i.test(String(u ?? ""));
const isMail = (e: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e ?? "").trim());
const BUDGET_MS = 100_000;
const OPTOUT = "Para não receber mais mensagens, responda SAIR";

function normPhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 13 ? d : null;
}
const render = (t: string, v: Record<string, string>) =>
  t.replace(/\{\{\s*(nome|loja|produto|link)\s*\}\}/g, (_m, k) => v[k] ?? "");
const addrOf = (from: string) => { const m = from.match(/<([^>]+)>/); return (m ? m[1] : from).trim(); };

function productLabel(items: any[]): string {
  const n = items.map((i) => String(i?.name ?? "").trim()).filter(Boolean);
  if (!n.length) return "seu pedido";
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} e ${n[1]}`;
  return `${n[0]} e mais ${n.length - 1} produtos`;
}

function emailHtml(text: string, items: any[], logo: string, link: string, loja: string) {
  const thumbs = items.filter((i) => isUrl(i?.image)).slice(0, 4).map((i) => {
    const img = `<img src="${esc(i.image)}" alt="${esc(i.name)}" width="72" height="72" style="border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;display:block">`;
    return isUrl(i.url)
      ? `<a href="${esc(i.url)}" style="display:inline-block;margin:0 8px 8px 0">${img}</a>`
      : `<span style="display:inline-block;margin:0 8px 8px 0">${img}</span>`;
  }).join("");
  const head = isUrl(logo) ? `<img src="${esc(logo)}" alt="${esc(loja)}" style="max-height:48px;margin-bottom:16px">` : `<div style="font-weight:700;font-size:18px;margin-bottom:16px">${esc(loja)}</div>`;
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:520px;margin:0 auto;padding:16px">${head}
<p style="margin:0 0 16px">${esc(text).replace(/\n/g, "<br>")}</p>${thumbs ? `<div style="margin:0 0 12px">${thumbs}</div>` : ""}
<a href="${esc(link)}" style="display:inline-block;background:#0094EB;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">Avaliar minha compra</a>
<p style="margin:20px 0 0;font-size:12px;color:#64748b">Se o botão não abrir, copie este link: ${esc(link)}</p></div>`;
}

type Ctx = { s: any; inst: { name: string; token: string | null } | null; name: string; mail: string; logo: string };
const cache = new Map<string, Ctx>();
async function ctxOf(storeId: string): Promise<Ctx> {
  const hit = cache.get(storeId);
  if (hit) return hit;
  const [{ data: s }, { data: store }, { data: ev }] = await Promise.all([
    db.from("review_invite_settings").select("*").eq("store_id", storeId).maybeSingle(),
    db.from("stores").select("*").eq("id", storeId).maybeSingle(),
    sdb.from("live_notify_settings").select("*").eq("store_id", storeId).maybeSingle(),
  ]);
  const ok = ev?.evolution_instance && ["open", "connected"].includes(String(ev.evolution_status ?? ""));
  const c: Ctx = {
    s,
    inst: ok ? { name: String(ev!.evolution_instance), token: (ev!.evolution_token as string | null) ?? null } : null,
    name: String(pick(store, ["reply_display_name", "name"]) ?? "Nossa loja"),
    mail: String(pick(store, ["contact_email", "support_email", "email"]) ?? ""),
    logo: String(store?.logo_url ?? ""),
  };
  cache.set(storeId, c);
  return c;
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-internal-secret") !== SECRET) return json({ error: "unauthorized" }, 401);
  if (!APP_URL) return json({ error: "APP_URL ausente" }, 500);
  const body = await req.json().catch(() => ({}));
  const dry = body?.dry === true;
  const t0 = Date.now();
  const out: any[] = [];

  if (!dry) {
    await db.from("review_requests").update({ status: "scheduled", claimed_at: null })
      .eq("status", "sending").lt("claimed_at", new Date(Date.now() - 15 * 60e3).toISOString())
      .is("email_sent_at", null).is("whatsapp_sent_at", null);
  }

  const { data: due } = await db.from("review_requests").select("*")
    .eq("status", "scheduled").lte("due_at", new Date().toISOString()).order("due_at").limit(40);

  for (const r of due ?? []) {
    if (Date.now() - t0 > BUDGET_MS) break;
    const c = await ctxOf(r.store_id);
    const s = c.s;
    const items: any[] = Array.isArray(r.items) ? r.items : [];
    const toMail = s?.email_enabled !== false && isMail(r.customer_email) ? String(r.customer_email).trim() : null;
    const toWa = s?.whatsapp_enabled && c.inst ? normPhone(r.customer_phone) : null;
    const overdue = Date.now() - new Date(r.due_at).getTime() > 30 * 86400e3;
    const skip = !s?.enabled ? "convite desativado" : overdue ? "expirado" : (!toMail && !toWa) ? "sem canal disponivel" : null;

    if (dry) { out.push({ id: r.id, order: r.order_id, toMail, toWa, skip, dry_run: true }); continue; }
    if (skip) {
      await db.from("review_requests").update({ status: "skipped", error: skip }).eq("id", r.id).eq("status", "scheduled");
      out.push({ id: r.id, skipped: skip });
      continue;
    }

    const { data: claimed } = await db.from("review_requests")
      .update({ status: "sending", claimed_at: new Date().toISOString() })
      .eq("id", r.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;

    const link = `${APP_URL}/avaliar/${r.token}`;
    const first = String(r.customer_name ?? "").trim().split(/\s+/)[0] ?? "";
    const v = { nome: first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "cliente", loja: c.name, produto: productLabel(items), link };
    let ok = false;
    const errs: string[] = [];

    if (toMail) {
      try {
        const text = render(String(s.email_body ?? ""), v);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${c.name.replace(/["<>]/g, "")} <${addrOf(MAIL_FROM)}>`,
            to: [toMail],
            ...(isMail(c.mail) ? { reply_to: c.mail } : {}),
            subject: render(String(s.email_subject ?? ""), v),
            html: emailHtml(text, items, c.logo, link, c.name),
            text: `${text}\n\n${link}`,
          }),
        });
        if (res.ok) { ok = true; await db.from("review_requests").update({ email_sent_at: new Date().toISOString() }).eq("id", r.id); }
        else errs.push(`email HTTP ${res.status}`);
      } catch (e) { errs.push(`email ${String((e as Error)?.message || e)}`); }
    }

    if (toWa && c.inst) {
      try {
        let text = render(String(s.whatsapp_body ?? ""), v);
        if (!text.includes(link)) text += `\n${link}`;
        text += `\n\n${OPTOUT}`;
        const res = await fetch(`${EVO_URL}/message/sendText/${c.inst.name}`, {
          method: "POST",
          headers: { apikey: c.inst.token || EVO_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ number: toWa, text }),
        });
        if (res.ok) { ok = true; await db.from("review_requests").update({ whatsapp_sent_at: new Date().toISOString() }).eq("id", r.id); }
        else errs.push(`whatsapp HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
      } catch (e) { errs.push(`whatsapp ${String((e as Error)?.message || e)}`); }
      await sleep(rnd(5, 12) * 1000);
    }

    await db.from("review_requests").update({ status: ok ? "sent" : "failed", error: errs.join(" | ") || null }).eq("id", r.id);
    out.push({ id: r.id, order: r.order_id, sent: ok, error: errs.join(" | ") || undefined });
  }
  return json({ dry_run: dry, processed: out.length, result: out });
});