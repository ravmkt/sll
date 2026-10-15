import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX")) ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TEST_SECRET") ?? "";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const ok =
    (token !== "" && token === SERVICE_KEY) ||
    (INTERNAL_SECRET !== "" && req.headers.get("x-internal-secret") === INTERNAL_SECRET);
  if (!ok) return json({ error: "FORBIDDEN" }, 403);
  if (!ASAAS_KEY) return json({ error: "ASAAS_KEY_AUSENTE" }, 500);

  const { data: rows, error } = await admin
    .from("invoices")
    .select("id, asaas_payment_id")
    .is("payment_method", null)
    .not("asaas_payment_id", "is", null)
    .limit(60);
  if (error) return json({ error: "DB_ERROR", details: error.message }, 500);

  let updated = 0;
  const failed: string[] = [];
  for (const r of rows ?? []) {
    const res = await fetch(`${ASAAS_URL}/payments/${r.asaas_payment_id}`, { headers: { access_token: ASAAS_KEY } });
    if (!res.ok) {
      failed.push(String(r.asaas_payment_id));
      // marca como desconhecido para nao reprocessar para sempre
      if (res.status === 404) await admin.from("invoices").update({ payment_method: "UNKNOWN" }).eq("id", r.id);
      continue;
    }
    const p = await res.json().catch(() => ({}));
    const { error: upErr } = await admin
      .from("invoices")
      .update({ payment_method: p.billingType ?? "UNKNOWN", invoice_url: p.invoiceUrl ?? null })
      .eq("id", r.id);
    if (upErr) failed.push(String(r.asaas_payment_id)); else updated++;
  }

  const { count } = await admin
    .from("invoices").select("id", { count: "exact", head: true })
    .is("payment_method", null).not("asaas_payment_id", "is", null);

  return json({ updated, failed, remaining: count ?? 0 });
});