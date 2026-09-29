import { useState } from "react";
import { Sparkles, Loader2, XCircle, CheckCircle2, Clock, AlertTriangle, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import type { StoreSubscription } from "@/services/subscriptions/getStoreSubscriptions";
import { cancelSubscription } from "@/services/subscriptions/getStoreSubscriptions";

const MODULE_LABELS: Record<string, string> = {
  vidlytics: "Vidlytics",
  live_commerce: "Live E-commerce",
  pdv: "PDV",
  gamification: "Gamificação",
  bundle: "Combo Master",
  unknown: "Módulo",
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "mês",
  semiannual: "semestre",
  yearly: "ano",
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

  // Se não há module_key (plano bundle: pacote-total, pacote-objetivo-*), mostra os módulos do plano
  const isBundle = !sub.module_key && (sub.plan?.modules?.length ?? 0) > 1;
  const singleModuleLabel = MODULE_LABELS[sub.module_key ?? "unknown"] ?? sub.module_key ?? "Módulo";
  const bundleModulesLabel = (sub.plan?.modules ?? [])
    .map((m) => MODULE_LABELS[m] ?? m)
    .join(" + ");

  const priceReais = (sub.price_cents / 100).toFixed(2).replace(".", ",");
  const cycleLabel = CYCLE_LABELS[sub.billing_cycle] ?? sub.billing_cycle;

  const handleCancel = async () => {
    if (!confirm(`Cancelar a assinatura de ${sub.plan?.name ?? "este plano"}? Esta ação também cancela a cobrança recorrente no gateway de pagamento.`)) return;
    setCanceling(true);
    try {
      await cancelSubscription(sub.id);
      onCanceled?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao cancelar assinatura. Tente novamente.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
          {isBundle && <Layers size={12} />}
          {isBundle ? bundleModulesLabel : singleModuleLabel}
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
          <span className="text-xs font-bold text-slate-400"> /{cycleLabel}</span>
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
          to={`/dashboard/planos${sub.module_key ? `?modulo=${sub.module_key}` : ""}`}
          className="text-xs font-black text-[#0091ff] hover:underline"
        >
          Trocar plano
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
