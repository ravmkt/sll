import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX")) ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const STALE_HOURS = 48;
const BATCH = 50;
// Qualquer um destes status significa que o cliente pagou (ou esta pagando): nunca cancelar
const BLOCKING = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "AWAITING_RISK_ANALYSIS"]);
const OPEN = new Set(["PENDING", "OVERDUE"]);

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function asaas(path: string, method = "GET") {
  const r = await fetch(`${ASAAS_URL}${path}`, { method, headers: { access_token: ASAAS_KEY } });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const authorized =
    (token !== "" && token === SERVICE_KEY) ||
    (INTERNAL_SECRET !== "" && req.headers.get("x-internal-secret") === INTERNAL_SECRET);
  if (!authorized) return json({ error: "FORBIDDEN" }, 403);
  if (!ASAAS_KEY) return json({ error: "ASAAS_KEY_AUSENTE" }, 500);

  const { dry_run } = await req.json().catch(() => ({}));
  const cutoff = new Date(Date.now() - STALE_HOURS * 3600 * 1000).toISOString();

  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("id, store_id, created_at, asaas_subscription_id, coupon_id")
    .eq("status", "incomplete")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) return json({ error: "DB_ERROR", details: error.message }, 500);

  const result: Record<string, unknown>[] = [];

  for (const s of subs ?? []) {
    const row: Record<string, unknown> = { subscription: s.id, store: s.store_id, created_at: s.created_at };

    // 1) Fatura paga localmente
    const { data: paidInv } = await admin
      .from("invoices").select("id").eq("subscription_id", s.id).not("paid_at", "is", null).limit(1);
    if (paidInv?.length) { result.push({ ...row, skipped: "FATURA_PAGA_NO_BANCO" }); continue; }

    // 2) Confirma no Asaas que nada foi pago
    let openPayments: string[] = [];
    if (s.asaas_subscription_id) {
      const pay = await asaas(`/subscriptions/${s.asaas_subscription_id}/payments?limit=100`);
      if (!pay.ok && pay.status !== 404) { result.push({ ...row, skipped: "ERRO_CONSULTA_ASAAS", status: pay.status }); continue; }
      const list: any[] = pay.ok ? (pay.body?.data ?? []) : [];
      if (list.some((p) => BLOCKING.has(String(p.status)))) {
        result.push({ ...row, skipped: "PAGAMENTO_NO_ASAAS" });
        continue;
      }
      openPayments = list.filter((p) => OPEN.has(String(p.status))).map((p) => String(p.id));
    }

    if (dry_run) { result.push({ ...row, would_cancel: true, open_payments: openPayments.length }); continue; }

    // 3) Releitura imediata: o webhook pode ter ativado a assinatura nesse intervalo
    const { data: fresh } = await admin.from("subscriptions").select("status").eq("id", s.id).maybeSingle();
    if (fresh?.status !== "incomplete") { result.push({ ...row, skipped: "STATUS_MUDOU" }); continue; }

    // 4) Cancela no Asaas (cobrancas abertas e assinatura)
    if (s.asaas_subscription_id) {
      for (const pid of openPayments) await asaas(`/payments/${pid}`, "DELETE");
      const del = await asaas(`/subscriptions/${s.asaas_subscription_id}`, "DELETE");
      if (!del.ok && del.status !== 404) {
        result.push({ ...row, error: "ERRO_CANCELAR_ASAAS", status: del.status });
        continue;
      }
    }

    // 5) Marca no banco (so se continuar incomplete); a trigger zera is_current
    const { data: upd, error: upErr } = await admin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", s.id)
      .eq("status", "incomplete")
      .select("id");
    if (upErr) { result.push({ ...row, error: "ERRO_DB", details: upErr.message }); continue; }

    result.push({ ...row, canceled: !!upd?.length, coupon_id: s.coupon_id ?? null });
  }

  console.log("cancel-stale-checkouts", JSON.stringify(result));
  return json({ dry_run: !!dry_run, processed: result.length, result });
});