import React from "react";
import type { ReferralDetail, ReferralStatus } from "@/services/AffiliateDatabaseService";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const dt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");

const STATUS: Record<ReferralStatus, { label: string; cls: string }> = {
  trial: { label: "Trial", cls: "bg-blue-50 text-blue-600" },
  trial_expired: { label: "Trial encerrado", cls: "bg-slate-100 text-slate-500" },
  paid: { label: "Pago", cls: "bg-green-50 text-green-600" },
  past_due: { label: "Atrasado", cls: "bg-amber-50 text-amber-600" },
  canceled: { label: "Cancelado", cls: "bg-red-50 text-red-600" },
  other: { label: "Ativo", cls: "bg-slate-100 text-slate-500" },
};

const PRODUCT_CLS: Record<string, string> = {
  vidlytics: "bg-sky-50 text-[#0094eb]",
  livecommerce: "bg-orange-50 text-[#fd8539]",
  live: "bg-orange-50 text-[#fd8539]",
};

export function ReferralDetailsTable({ rows }: { rows: ReferralDetail[] }) {
  const toRelease = rows.reduce((sum, r) => sum + r.commission_pending, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-slate-800">Suas Indicações</h3>
        <span className="text-xs text-slate-500">
          Comissão a liberar: <strong className="text-amber-600">{brl(toRelease)}</strong>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 text-[11px] uppercase border-b border-slate-100">
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Entrou em</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Você ainda não indicou nenhuma loja.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const st = STATUS[r.status] ?? STATUS.other;
                const prodCls = PRODUCT_CLS[(r.product_key || "").toLowerCase()] ?? "bg-slate-100 text-slate-600";
                return (
                  <tr key={r.subscription_id ?? r.store_id} className="border-b border-slate-50 align-top hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{r.store_name}</td>
                    <td className="px-4 py-3">
                      {r.product_name ? (
                        <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${prodCls}`}>{r.product_name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.plan_name || (r.status === "trial" ? "Período de teste" : "—")}</td>
                    <td className="px-4 py-3 text-slate-500">{dt(r.joined_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      {r.status === "trial" && r.trial_ends_at && (
                        <p className="text-[11px] text-slate-400 mt-1">Trial até {dt(r.trial_ends_at)}</p>
                      )}
                      {r.status === "canceled" && r.canceled_at && (
                        <p className="text-[11px] text-slate-400 mt-1">Cancelou em {dt(r.canceled_at)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 space-y-0.5">
                      {r.status === "trial" && r.commission_pending + r.commission_released === 0 && (
                        <p className="text-[11px] text-slate-400">Aguardando o primeiro pagamento</p>
                      )}
                      {r.commission_pending > 0 && (
                        <p className="text-xs text-amber-600 font-bold">
                          A liberar {brl(r.commission_pending)}
                          {r.next_release_at ? ` em ${dt(r.next_release_at)}` : ""}
                        </p>
                      )}
                      {r.commission_released > 0 && (
                        <p className="text-xs text-green-600 font-bold">Liberada {brl(r.commission_released)}</p>
                      )}
                      {r.commission_canceled > 0 && (
                        <p className="text-xs text-red-500 line-through">Cancelada {brl(r.commission_canceled)}</p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}