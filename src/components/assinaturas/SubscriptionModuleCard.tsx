import { useState } from "react";
import { Sparkles, Loader2, XCircle, CheckCircle2, Clock, AlertTriangle, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import type { StoreSubscription } from "@/services/subscriptions/getStoreSubscriptions";
import { cancelSubscription } from "@/services/subscriptions/getStoreSubscriptions";
import { ConfirmDangerModal } from "@/components/common/AppModal";

const MODULE_LABELS: Record<string, string> = {
  vidlytics: "Vidlytics",
  stream_sell: "Stream Sell",
  pdv: "PDV",
  gamification: "Gamifica\u00e7\u00e3o",
  bundle: "Combo Master",
  unknown: "M\u00f3dulo",
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "m\u00eas",
  semiannual: "semestre",
  yearly: "ano",
};

const CYCLE_ADJ: Record<string, string> = {
  monthly: "mensal",
  semiannual: "semestral",
  yearly: "anual",
  annual: "anual",
};

const STATUS_STYLE: Record<string, { label: string; className: string; dot: string; icon: React.ReactNode }> = {
  active: { label: "Ativo", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: <CheckCircle2 size={13} /> },
  trialing: { label: "Em Teste", className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: <Clock size={13} /> },
  lifetime: { label: "Vital\u00edcio", className: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", icon: <Sparkles size={13} /> },
  past_due: { label: "Pagamento Pendente", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: <AlertTriangle size={13} /> },
  canceled: { label: "Cancelado", className: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", icon: <XCircle size={13} /> },
};

export function SubscriptionModuleCard({ sub, onCanceled }: { sub: StoreSubscription; onCanceled?: () => void }) {
  const [canceling, setCanceling] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [error, setError] = useState("");
  const status = STATUS_STYLE[sub.status] ?? STATUS_STYLE.active;

  const isBundle = !sub.module_key && (sub.plan?.modules?.length ?? 0) > 1;
  const singleModuleLabel = MODULE_LABELS[sub.module_key ?? "unknown"] ?? sub.module_key ?? "M\u00f3dulo";
  const bundleModulesLabel = (sub.plan?.modules ?? []).map((m) => MODULE_LABELS[m] ?? m).join(" + ");

  const priceReais = (sub.price_cents / 100).toFixed(2).replace(".", ",");
  const cycleLabel = CYCLE_LABELS[sub.billing_cycle] ?? sub.billing_cycle;
  const cycleAdj = CYCLE_ADJ[String(sub.billing_cycle)] ?? String(sub.billing_cycle);
  const dateLabel = sub.status === "trialing" ? "Teste termina em" : "Renova em";
  const showDate = !!sub.current_period_end && sub.status !== "canceled" && sub.status !== "lifetime";

  const doCancel = async () => {
    setCanceling(true);
    setError("");
    try {
      await cancelSubscription(sub.id);
      setAskCancel(false);
      onCanceled?.();
    } catch (e) {
      setAskCancel(false);
      setError(e instanceof Error ? e.message : "Erro ao cancelar assinatura. Tente novamente.");
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
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-black text-slate-900">{sub.plan?.name ?? "Plano"}</h3>
        <p className="text-2xl font-black text-[#0091ff]">
          R$ {priceReais}
          <span className="text-xs font-bold text-slate-400"> /{cycleLabel}</span>
        </p>
        {((sub as any).addons_cents ?? 0) > 0 && (
          <p className="mt-1 text-[11px] font-bold text-slate-500">
            {"+ R$ " + (((sub as any).addons_cents as number) / 100).toFixed(2).replace(".", ",") + " em complementos"}
          </p>
        )}
        {sub.is_prorated && (
          <p className="mt-1 text-[11px] font-bold text-amber-600">
            {"Cobran\u00e7a proporcional at\u00e9 o vencimento \u2014 ajusta no pr\u00f3ximo ciclo."}
          </p>
        )}
        {showDate && (
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {dateLabel + " " + new Date(sub.current_period_end as string).toLocaleDateString("pt-BR") + " (cobran\u00e7a " + cycleAdj + ")"}
          </p>
        )}
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <Link
          to={`/dashboard/planos${sub.module_key ? `?modulo=${sub.module_key}` : ""}`}
          className="text-xs font-black text-[#0091ff] hover:underline"
        >
          {"Alterar plano ou ciclo"}
        </Link>
        {sub.status !== "canceled" && sub.status !== "lifetime" && (
          <button
            type="button"
            onClick={() => setAskCancel(true)}
            disabled={canceling}
            className="cursor-pointer text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:underline disabled:opacity-50"
          >
            {canceling ? <Loader2 size={12} className="animate-spin" /> : "Cancelar assinatura"}
          </button>
        )}
      </div>

      <ConfirmDangerModal
        open={askCancel}
        title="CANCELAR ASSINATURA"
        itemName={sub.plan?.name ?? "Plano"}
        message={"Cancelar a assinatura de " + (sub.plan?.name ?? "este plano") + "? A cobran\u00e7a recorrente tamb\u00e9m ser\u00e1 cancelada no gateway de pagamento."}
        confirmLabel="Cancelar assinatura"
        busy={canceling}
        onClose={() => setAskCancel(false)}
        onConfirm={doCancel}
      />
    </div>
  );
}