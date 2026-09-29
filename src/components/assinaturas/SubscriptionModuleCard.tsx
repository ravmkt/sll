import { useState } from "react";
import { Sparkles, Loader2, XCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import type { StoreSubscription } from "@/services/subscriptions/getStoreSubscriptions";
import { cancelSubscription } from "@/services/subscriptions/getStoreSubscriptions";

const MODULE_LABELS: Record<string, string> = {
  vidlytics: "Vidlytics",
  live_commerce: "Live E-commerce",
  gamification: "Gamificação",
  bundle: "Combo Master",
  unknown: "Módulo",
};

const STATUS_STYLE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  active: { label: "Ativo", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={13} /> },
  trialing: { label: "Em Teste", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <Clock size={13} /> },
  lifetime: { label: "Vitalício", className: "bg-purple-50 text-purple-700 border-purple-200", icon: <Sparkles size={13} /> },
  past_due: { label: "Pagamento Pendente", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertTriangle size={13} /> },
  canceled: { label: "Cancelado", className: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle size={13} /> },
};

export function SubscriptionModuleCard({ sub, onCanceled }: { sub: StoreSubscription; onCanceled?: () => void }) {
  const [canceling, setCanceling] = useState(false);
  const status = STATUS_STYLE[sub.status] ?? STATUS_STYLE.active;
  const moduleKey = sub.module_key ?? "unknown";
  const moduleLabel = MODULE_LABELS[moduleKey] ?? moduleKey;
  const priceReais = sub.plan ? (sub.plan.price_cents / 100).toFixed(2).replace(".", ",") : "0,00";

  const handleCancel = async () => {
    if (!confirm(`Cancelar a assinatura de ${moduleLabel}?`)) return;
    setCanceling(true);
    try {
      await cancelSubscription(sub.id);
      onCanceled?.();
    } catch (e) {
      alert("Erro ao cancelar assinatura. Tente novamente.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {moduleLabel}
        </span>
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${status.className}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-black text-slate-900">
          {sub.plan?.name ?? "Plano"}
        </h3>
        <p className="text-2xl font-black text-[#0091ff]">
          R$ {priceReais}
          <span className="text-xs font-bold text-slate-400"> /{sub.billing_cycle === "monthly" ? "mês" : sub.billing_cycle === "semiannual" ? "semestre" : "ano"}</span>
        </p>
        {sub.is_prorated && (
          <p className="mt-1 text-[11px] font-bold text-amber-600">
            Cobrança proporcional até o vencimento — ajusta no próximo ciclo.
          </p>
        )}
        {sub.current_period_end && (
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Próxima cobrança: {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <Link
          to={`/dashboard/planos?modulo=${moduleKey}`}
          className="text-xs font-black text-[#0091ff] hover:underline"
        >
          Trocar plano deste módulo
        </Link>
        {sub.status !== "canceled" && sub.status !== "lifetime" && (
          <button
            onClick={handleCancel}
            disabled={canceling}
            className="text-xs font-black text-rose-500 hover:underline disabled:opacity-50"
          >
            {canceling ? <Loader2 size={12} className="animate-spin" /> : "Cancelar"}
          </button>
        )}
      </div>
    </div>
  );
}
