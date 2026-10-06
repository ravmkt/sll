import React from "react";
import type { ReferralDetail, ReferralStatus } from "@/services/AffiliateDatabaseService";
import { CARD } from "./clubeStyles";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const dt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");

const GOLD_PILL = "bg-[#D4AF37]/10 text-[#F3E2A9]";

const STATUS: Record<ReferralStatus, { label: string; cls: string }> = {
  trial: { label: "Trial", cls: GOLD_PILL },
  trial_expired: { label: "Trial encerrado", cls: "bg-white/10 text-white/50" },
  paid: { label: "Pago", cls: "bg-green-500/10 text-green-400" },
  past_due: { label: "Atrasado", cls: "bg-[#FF6A1A]/10 text-[#FF6A1A]" },
  canceled: { label: "Cancelado", cls: "bg-red-500/10 text-red-400" },
  other: { label: "Ativo", cls: GOLD_PILL },
};

export function ReferralDetailsTable({ rows }: { rows: ReferralDetail[] }) {
  const toRelease = rows.reduce((sum, r) => sum + r.commission_pending, 0);

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold uppercase tracking-[0.2em] text-sm text-white">Suas indicações</h3>
        <span className="text-xs text-white/60">
          Comissão a liberar: <strong className="text-[#FF6A1A]">{brl(toRelease)}</strong>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#D4AF37]/70 text-[11px] uppercase tracking-[0.2em] border-b border-white/5">
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Entrou em</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Comissão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  Você ainda não indicou nenhuma loja.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const st = STATUS[r.status] ?? STATUS.other;
                return (
                  <tr key={r.subscription_id ?? r.store_id} className="align-top hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{r.store_name}</td>
                    <td className="px-4 py-3">
                      {r.product_name ? (
                        <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${GOLD_PILL}`}>{r.product_name}</span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70">{r.plan_name || (r.status === "trial" ? "Período de teste" : "—")}</td>
                    <td className="px-4 py-3 text-white/50">{dt(r.joined_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      {r.status === "trial" && r.trial_ends_at && (
                        <p className="text-[11px] text-white/40 mt-1">Trial até {dt(r.trial_ends_at)}</p>
                      )}
                      {r.status === "canceled" && r.canceled_at && (
                        <p className="text-[11px] text-white/40 mt-1">Cancelou em {dt(r.canceled_at)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 space-y-0.5">
                      {r.status === "trial" && r.commission_pending + r.commission_released === 0 && (
                        <p className="text-[11px] text-white/40">Aguardando o primeiro pagamento</p>
                      )}
                      {r.commission_pending > 0 && (
                        <p className="text-xs text-[#FF6A1A] font-bold">
                          A liberar {brl(r.commission_pending)}
                          {r.next_release_at ? ` em ${dt(r.next_release_at)}` : ""}
                        </p>
                      )}
                      {r.commission_released > 0 && (
                        <p className="text-xs text-green-400 font-bold">Liberada {brl(r.commission_released)}</p>
                      )}
                      {r.commission_canceled > 0 && (
                        <p className="text-xs text-red-400 line-through">Cancelada {brl(r.commission_canceled)}</p>
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