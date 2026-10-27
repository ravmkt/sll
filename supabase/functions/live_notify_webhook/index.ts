import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "live_commerce" } });
const SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    if (!SECRET || u.searchParams.get("secret") !== SECRET) return json({ error: "unauthorized" }, 401);
    const evt = await req.json();
    const event = String(evt?.event ?? "").toLowerCase();
    if (!event.includes("messages") || !event.includes("upsert")) return json({ ok: true, ignored: event });

    const d = Array.isArray(evt.data) ? evt.data[0] : evt.data;
    if (!d || d?.key?.fromMe) return json({ ok: true, ignored: "fromMe" });
    const text = String(d?.message?.conversation ?? d?.message?.extendedTextMessage?.text ?? "").trim().toUpperCase();
    if (text !== "SAIR") return json({ ok: true, ignored: "texto" });

    const phone = String(d?.key?.remoteJid ?? "").replace(/\D/g, "");
    if (phone.length < 10) return json({ ok: true, ignored: "sem numero" });
    const tail = phone.slice(-9);

    const instance = String(evt?.instance ?? "");
    const { data: inst } = await db.from("store_whatsapp_instances").select("store_id").eq("instance_name", instance).maybeSingle();
    if (!inst) return json({ ok: true, ignored: "instancia desconhecida" });

    const { data: lives } = await db.from("lives").select("id").eq("store_id", inst.store_id);
    const ids = (lives ?? []).map((l: any) => l.id);
    if (!ids.length) return json({ ok: true, updated: 0 });

    const { data: leads } = await db.from("live_leads").select("*").in("live_id", ids).limit(5000);
    const match = (leads ?? []).filter((l: any) => String(l.whatsapp ?? l.phone ?? l.telefone ?? "").replace(/\D/g, "").endsWith(tail));
    for (const l of match) await db.from("live_leads").update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() }).eq("id", l.id);
    return json({ ok: true, updated: match.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});