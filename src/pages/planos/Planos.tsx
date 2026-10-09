import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoja } from "@/contexts/LojaContext";
import { toast } from "sonner";
import { PlanCard } from "@/components/planos/PlanCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getCatalogModules,
  getCatalogShowcase,
  type CatalogModule,
  type CatalogPlan,
} from "@/services/plans/getCatalogShowcase";

type BillingCycle = "monthly" | "semiannual" | "yearly";

const CYCLES: [BillingCycle, string][] = [
  ["monthly", "Mensal"],
  ["semiannual", "Semestral"],
  ["yearly", "Anual"],
];

function priceFor(p: CatalogPlan, cycle: BillingCycle): number {
  if (cycle === "semiannual") return p.price_semiannual_cents;
  if (cycle === "yearly") return p.price_annual_cents;
  return p.price_monthly_cents;
}

export default function Planos() {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [soon, setSoon] = useState<CatalogModule[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    Promise.all([getCatalogShowcase(), getCatalogModules()]).then(([list, mods]) => {
      setPlans(list);
      setSoon(mods.filter((m) => m.status === "coming_soon"));
      setLoading(false);
    });
  }, []);

  function handleSelect(p: CatalogPlan) {
    if (!storeId) {
      toast.error("Nenhuma loja ativa encontrada.");
      return;
    }
    const qs = new URLSearchParams({ plan: p.id, cycle, module: p.module_slug });
    navigate(`/dashboard/checkout?${qs.toString()}`);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0091ff]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8 pb-20">
        <button
          type="button"
          onClick={() => navigate("/dashboard/assinaturas")}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-[#0091ff] transition-colors mb-2"
        >
          <ArrowLeft size={16} />
          Voltar para Minhas Assinaturas
        </button>

        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Escolha o plano ideal para sua loja
          </h1>
          <p className="text-sm font-medium text-slate-500">Escolha o plano e o ciclo de cobrança.</p>

          <div className="flex justify-center pt-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
              {CYCLES.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCycle(key)}
                  className={cn(
                    "px-4 py-2 text-xs font-black rounded-xl transition-all",
                    cycle === key ? "bg-white text-[#0091ff] shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {plans.length === 0 ? (
          <p className="text-center text-sm text-slate-500 pt-6">Nenhum plano disponível no momento.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4 max-w-5xl mx-auto">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                title={p.plan_name}
                description={null}
                priceCents={priceFor(p, cycle)}
                cycle={cycle}
                modules={[p.module_slug]}
                isPopular={p.plan_tier === "pro"}
                onSelect={() => handleSelect(p)}
              />
            ))}
          </div>
        )}

        {soon.length > 0 && (
          <div className="max-w-5xl mx-auto space-y-3">
            <h2 className="text-center text-xs font-black uppercase tracking-wider text-slate-400">Em breve</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {soon.map((m) => (
                <div
                  key={m.slug}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.name} className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-black text-slate-500">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p className="truncate text-sm font-black uppercase tracking-tight text-slate-700">{m.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                    Em breve
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}