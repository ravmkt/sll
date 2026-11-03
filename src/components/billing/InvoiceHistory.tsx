import { useEffect, useState } from "react";
import { Download, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLoja } from "@/contexts/LojaContext";

const sb: any = supabase;

type Row = {
  id?: string;
  created_at?: string | null;
  paid_at?: string | null;
  description?: string | null;
  cycle?: string | null;
  amount_cents?: number | null;
  payment_method?: string | null;
  status?: string | null;
  receipt_url?: string | null;
  invoice_url?: string | null;
};

const T = {
  title: "Hist\u00f3rico de faturas e pagamentos",
  empty: "Nenhuma fatura anterior registrada.",
  date: "Data",
  desc: "Descri\u00e7\u00e3o",
  cycle: "Ciclo",
  value: "Valor pago",
  method: "Pagamento",
  status: "Status",
  actions: "A\u00e7\u00f5es",
  receipt: "Comprovante",
  nf: "Nota fiscal",
};

const CYCLES: Record<string, string> = {
  monthly: "Mensal", mensal: "Mensal",
  semiannual: "Semestral", semestral: "Semestral",
  yearly: "Anual", annual: "Anual", anual: "Anual",
};

const METHODS: Record<string, string> = {
  credit_card: "Cart\u00e3o de cr\u00e9dito", card: "Cart\u00e3o de cr\u00e9dito",
  pix: "Pix", boleto: "Boleto", bank_slip: "Boleto",
};

function statusOf(s?: string | null) {
  const v = String(s ?? "").toLowerCase();
  if (["paid", "pago", "received", "confirmed", "succeeded"].includes(v))
    return { label: "Pago", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (["failed", "falhou", "overdue", "refused", "canceled", "cancelled"].includes(v))
    return { label: "Falhou", cls: "border-red-200 bg-red-50 text-red-700" };
  return { label: "Pendente", cls: "border-amber-200 bg-amber-50 text-amber-700" };
}

const fmtDate = (r: Row) => {
  const d = r.paid_at || r.created_at;
  return d ? new Date(d).toLocaleDateString("pt-BR") : "-";
};

const fmtMoney = (c?: number | null) =>
  c == null ? "-" : (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LINK =
  "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:border-[#0091ff] hover:text-[#0091ff]";

export default function InvoiceHistory() {
  const { storeId } = useLoja();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const { data } = await sb
        .from("billing_invoices")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!alive) return;
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [storeId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0091ff]/10 text-[#0091ff]">
          <Receipt size={20} />
        </span>
        <h2 className="text-base font-black text-slate-900">{T.title}</h2>
      </div>

      <div className="border-t border-slate-100">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#0091ff]" /></div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm font-bold text-slate-500">{T.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">{T.date}</th>
                  <th className="px-3 py-3">{T.desc}</th>
                  <th className="px-3 py-3">{T.cycle}</th>
                  <th className="px-3 py-3">{T.value}</th>
                  <th className="px-3 py-3">{T.method}</th>
                  <th className="px-3 py-3">{T.status}</th>
                  <th className="px-5 py-3">{T.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const st = statusOf(r.status);
                  return (
                    <tr key={r.id ?? i} className="text-slate-700">
                      <td className="px-5 py-3 font-semibold">{fmtDate(r)}</td>
                      <td className="px-3 py-3">{r.description || "-"}</td>
                      <td className="px-3 py-3">{CYCLES[String(r.cycle ?? "").toLowerCase()] || r.cycle || "-"}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{fmtMoney(r.amount_cents)}</td>
                      <td className="px-3 py-3">{METHODS[String(r.payment_method ?? "").toLowerCase()] || r.payment_method || "-"}</td>
                      <td className="px-3 py-3">
                        <span className={"rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase " + st.cls}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          {r.receipt_url && (
                            <a href={r.receipt_url} target="_blank" rel="noreferrer" className={LINK}>
                              <Download size={12} /> {T.receipt}
                            </a>
                          )}
                          {r.invoice_url && (
                            <a href={r.invoice_url} target="_blank" rel="noreferrer" className={LINK}>
                              <Download size={12} /> {T.nf}
                            </a>
                          )}
                          {!r.receipt_url && !r.invoice_url && <span className="text-slate-400">-</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}