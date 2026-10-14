import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLoja } from "@/contexts/LojaContext";
import { bumpTotal, useUpsells } from "@/components/checkout/OrderBumpCard";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import type { CatalogPlan } from "@/services/plans/getCatalogShowcase";
import { CYCLE_MONTHS, brl, cycleCents } from "@/components/planos/planosShared";
import ComparePlans from "@/components/planos/ComparePlans";

const CYCLES: { key: PlanCycle; label: string; badge?: string }[] = [
  { key: "monthly", label: "Mensal" },
  { key: "semiannual", label: "Semestral", badge: "17% OFF" },
  { key: "yearly", label: "Anual", badge: "4 MESES GRÁTIS" },
];

export default function ModuloPlanoModal({
  slug,
  name,
  logoUrl,
  plans,
  initialCycle,
  currentTier,
  onClose,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  plans: CatalogPlan[];
  initialCycle: PlanCycle;
  currentTier: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const sorted = useMemo(() => [...plans].sort((a, b) => a.price_monthly_cents - b.price_monthly_cents), [plans]);
  const tierOf = (p: CatalogPlan) => String(p.plan_tier || "").toLowerCase();
  const isCur = (p: CatalogPlan) => !!currentTier && tierOf(p) === currentTier;

  const [planId, setPlanId] = useState(
    () => (sorted.find((p) => !isCur(p) && tierOf(p) === "pro") ?? sorted.find((p) => !isCur(p)) ?? sorted[0])?.id ?? ""
  );
  const [cycle, setCycle] = useState<PlanCycle>(initialCycle);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const items = useUpsells([slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const plan = sorted.find((p) => p.id === planId);
  const months = CYCLE_MONTHS[cycle];
  const planCents = plan ? cycleCents(plan, cycle) : 0;
  const addonsCents = Math.round(bumpTotal(items, sel, cycle) * 100);
  const total = planCents + addonsCents;

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function proceed() {
    if (!plan) return;
    if (!storeId) {
      toast.error("Nenhuma loja ativa encontrada.");
      return;
    }
    const qs = new URLSearchParams({ plan: plan.id, cycle, module: slug, mods: slug });
    if (sel.size > 0) qs.set("addons", Array.from(sel).join(","));
    navigate(`/dashboard/checkout?${qs.toString()}`);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Planos do ${name}`}
    >
      <div
        className="grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-[1.6fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6 overflow-y-auto p-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-10 w-10 rounded-xl object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 font-black text-slate-500">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className="text-xl font-black text-slate-900">{name}</h3>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">1. Escolha o plano</p>
            {sorted.map((p) => {
              const cur = isCur(p);
              const on = p.id === planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={cur}
                  onClick={() => setPlanId(p.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-colors",
                    on ? "border-[#0091ff] bg-[#0091ff]/5" : "border-slate-200 hover:border-slate-300",
                    cur && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="text-sm font-black text-slate-900">
                    {p.plan_name}
                    {cur && <span className="ml-2 text-[10px] font-bold uppercase text-emerald-600">Plano atual</span>}
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {brl(Math.round(cycleCents(p, cycle) / months))}
                    <span className="text-xs font-bold text-slate-400">/mês</span>
                  </span>
                </button>
              );
            })}
          </div>

          <ComparePlans
            slug={slug}
            plans={sorted}
            selectedId={planId}
            onSelect={(id) => setPlanId(id)}
            isCurrent={isCur}
          />

          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">2. Turbine com add-ons (opcional)</p>
              {items.map((a) => {
                const on = sel.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border-2 border-dashed p-3 text-left transition-colors",
                      on ? "border-[#fd8539] bg-[#fd8539]/10" : "border-[#fd8539]/50 hover:bg-[#fd8539]/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                        on ? "border-[#fd8539] bg-[#fd8539] text-white" : "border-slate-300 bg-white"
                      )}
                    >
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                        <Zap size={14} className="text-[#fd8539]" /> {a.upsell_headline || a.name}
                      </span>
                      <span className="block text-xs text-slate-600">{a.description || a.name}</span>
                      <span className="mt-0.5 block text-xs font-bold text-[#c2571a]">{brl(Math.round(a.price_monthly * 100))}/mês</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-5 overflow-y-auto bg-slate-50 p-6">
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{items.length > 0 ? "3." : "2."} Periodicidade</p>
              <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {CYCLES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCycle(c.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border-2 bg-white px-4 py-2.5 text-left",
                    cycle === c.key ? "border-[#0091ff]" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span className="text-xs font-black text-slate-800">{c.label}</span>
                  {c.badge && (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase text-white">{c.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Seu carrinho</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{plan?.plan_name ?? "-"}</span>
                <span className="font-semibold">{brl(planCents)}</span>
              </div>
              {items
                .filter((a) => sel.has(a.id))
                .map((a) => (
                  <div key={a.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{a.name}</span>
                    <span className="font-semibold">{brl(Math.round(a.price_monthly * 100 * months))}</span>
                  </div>
                ))}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
                <span>Total</span>
                <span>{brl(total)}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {months === 1 ? "Cobrança mensal." : `Cobrado a cada ${months} meses.`} Cupom e teste grátis no próximo passo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={proceed}
            disabled={!plan}
            className="w-full rounded-2xl bg-[#0091ff] py-3 text-sm font-black text-white hover:bg-[#0080e0] disabled:opacity-50"
          >
            Continuar para o pagamento
          </button>
        </div>
      </div>
    </div>
  );
}