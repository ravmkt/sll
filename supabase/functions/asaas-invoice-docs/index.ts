import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IS_PROD = (Deno.env.get("ASAAS_ENV") ?? "sandbox") === "production";
const ASAAS_URL = IS_PROD ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = (IS_PROD ? Deno.env.get("ASAAS_API_KEY") : Deno.env.get("ASAAS_API_KEY_SANDBOX")) ?? "";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function isSuperadmin(user: { id: string; app_metadata?: Record<string, unknown> }) {
  if (user.app_metadata?.is_superadmin === true) return true;
  const { data, error } = await admin.from("admin_superusers").select("*").eq("user_id", user.id).limit(1);
  return !error && !!data && data.length > 0;
}

const asaas = async (path: string) => {
  const r = await fetch(`${ASAAS_URL}${path}`, { headers: { access_token: ASAAS_KEY } });
  return { ok: r.ok, data: await r.json().catch(() => ({})) as any };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "NAO_AUTENTICADO" }, 401);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user || !(await isSuperadmin(u.user))) return json({ error: "NAO_AUTORIZADO" }, 403);

    const { invoice_id } = await req.json().catch(() => ({}));
    if (!invoice_id) return json({ error: "INVOICE_ID_OBRIGATORIO" }, 400);

    const { data: inv } = await admin.from("invoices").select("*").eq("id", invoice_id).maybeSingle();
    if (!inv) return json({ error: "FATURA_NAO_ENCONTRADA" }, 404);

    let invoiceUrl: string | null = inv.invoice_url ?? null;
    let receiptUrl: string | null = null;
    let nf: Record<string, unknown> | null = null;
    let checked = false;

    const pid = inv.asaas_payment_id as string | null;
    if (pid && ASAAS_KEY) {
      const pay = await asaas(`/payments/${pid}`);
      if (pay.ok) {
        invoiceUrl = pay.data.invoiceUrl ?? invoiceUrl;
        receiptUrl = pay.data.transactionReceiptUrl ?? null;
      }
      const nfs = await asaas(`/invoices?payment=${pid}&limit=10`);
      if (nfs.ok) {
        checked = true;
        const list: any[] = nfs.data?.data ?? [];
        const best = list.find((x) => x.status === "AUTHORIZED") ?? list[0];
        if (best) {
          nf = {
            number: best.number ?? null,
            status: best.status ?? null,
            pdf_url: best.pdfUrl ?? null,
            xml_url: best.xmlUrl ?? null,
          };
        }
      }
    }

    return json({ invoice_url: invoiceUrl, receipt_url: receiptUrl, nf, nf_checked: checked, has_payment: !!pid });
  } catch (err) {
    return json({ error: "UNEXPECTED_ERROR", details: String(err) }, 500);
  }
});