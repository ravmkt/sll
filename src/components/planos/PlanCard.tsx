import { Check, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<string, string> = {
  vidlytics: "Vidlytics",
  live_commerce: "Live E-commerce",
  pdv: "PDV",
};

type Props = {
  title: string;
  description?: string | null;
  priceCents: number;
  cycle: "monthly" | "semiannual" | "yearly";
  modules: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  isLoading?: boolean;
  onSelect: () => void;
};

const CYCLE_LABEL: Record<Props["cycle"], string> = {
  monthly: "/mês",
  semiannual: "/mês (semestral)",
  yearly: "/mês (anual)",
};

const CYCLE_MONTHS: Record<Props["cycle"], number> = {
  monthly: 1,
  semiannual: 6,
  yearly: 12,
};

export function PlanCard({
  title,
  description,
  priceCents,
  cycle,
  modules,
  isPopular,
  isCurrent,
  isLoading,
  onSelect,
}: Props) {
  const monthlyReais = (priceCents / 100 / CYCLE_MONTHS[cycle]).toFixed(2).replace(".", ",");
  const totalReais = (priceCents / 100).toFixed(2).replace(".", ",");

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-3xl border bg-white p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 shadow-sm",
        isPopular ? "border-[#0091ff] shadow-lg shadow-blue-500/10 ring-1 ring-[#0091ff]/30" : "border-slate-200",
        isCurrent && "bg-slate-50/70"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0091ff] px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md">
          Mais Popular
        </div>
      )}

      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
          {isCurrent && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
              Atual
            </span>
          )}
        </div>

        {description && <p className="text-xs font-medium text-slate-500 mb-4">{description}</p>}

        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-slate-900 tracking-tight">R$ {monthlyReais}</span>
          <span className="text-xs font-bold text-slate-400">{CYCLE_LABEL[cycle]}</span>
        </div>
        {cycle !== "monthly" && (
          <span className="text-[10px] font-bold text-emerald-500 mt-1 block">
            Total cobrado: R$ {totalReais} no ciclo
          </span>
        )}

        <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
          {modules.map((m) => (
            <div key={m} className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
              <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#0091ff] text-white shrink-0">
                <Check size={11} className="stroke-[3]" />
              </div>
              <span>{MODULE_LABELS[m] ?? m}</span>
            </div>
          ))}
          {modules.includes("live_commerce") && (
            <div className="flex items-center gap-2 text-xs font-black text-rose-600 bg-rose-50 border border-rose-200/50 rounded-xl p-2">
              <Radio size={13} className="animate-pulse" />
              Transmissões ao vivo inclusas
            </div>
          )}
        </div>
      </div>

      <div className="mt-7 pt-4 border-t border-slate-100">
        <button
          type="button"
          disabled={isCurrent || isLoading}
          onClick={onSelect}
          className={cn(
            "w-full rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            isCurrent
              ? "bg-slate-100 text-slate-400 cursor-default"
              : "bg-[#0091ff] hover:bg-[#0070f3] text-white shadow-lg hover:scale-[1.02]"
          )}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : isCurrent ? "Plano Atual" : "Assinar"}
        </button>
      </div>
    </div>
  );
}
