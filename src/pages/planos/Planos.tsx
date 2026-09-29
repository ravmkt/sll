import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoja } from "@/context/LojaContext";
import { toast } from "sonner";
import {
  getPlansShowcase,
  getPlanKind,
  getPriceForCycle,
  subscribeToPlan,
  type Plan,
  type PlanObjective,
  type PlanPrice,
} from "@/services/plans/getPlansShowcase";
import { PlanCard } from "@/components/planos/PlanCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type BillingCycle = "monthly" | "semiannual" | "yearly";
type TabKey = "individual" | "objective" | "total";

const TABS: { key: TabKey; label: string }[] = [
  { key: "individual", label: "Módulos Individuais" },
  { key: "objective", label: "Pacotes por Objetivo" },
  { key: "total", label: "Pacote Total" },
];

export default function Planos() {
  const navigate = useNavigate();
  const { storeId } = useLoja();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [objectives, setObjectives] = useState<PlanObjective[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [tab, setTab] = useState<TabKey>("individual");
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  useEffect(() => {
    getPlansShowcase().then(({ plans, prices, objectives }) => {
      setPlans(plans);
      setPrices(prices);
      setObjectives(objectives);
      setLoading(false);
    });
  }, []);

  const individualPlans = useMemo(() => plans.filter((p) => getPlanKind(p.slug) === "individual"), [plans]);
  const totalPlan = useMemo(() => plans.find((p) => p.slug === "pacote-total"), [plans]);

  async function handleSelect(plan: Plan, moduleKey?: string | null) {
    if (!storeId) {
      toast.error("Nenhuma loja ativa encontrada.");
      return;
    }
    setSubscribingId(plan.id);
    const result = await subscribeToPlan({ storeId, planId: plan.id, billingCycle: cycle, moduleKey });
    setSubscribingId(null);

    if (result.error) {
      toast.error(result.error === "SESSAO_EXPIRADA" ? "Sessão expirada. Faça login novamente." : result.error);
      return;
    }
    if (result.invoiceUrl) {
      toast.success("Redirecionando para o checkout...");
      window.location.href = result.invoiceUrl;
    }
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
            Escolha os módulos ideais para sua loja
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Assine módulos individualmente ou aproveite os pacotes com desconto.
          </p>

          <div className="flex justify-center pt-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
              {([
                ["monthly", "Mensal"],
                ["semiannual", "Semestral"],
                ["yearly", "Anual"],
              ] as [BillingCycle, string][]).map(([key, label]) => (
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

          <div className="flex justify-center gap-2 pt-3 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                  tab === t.key
                    ? "bg-[#0091ff] text-white border-[#0091ff]"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#0091ff]/50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "individual" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4 max-w-5xl mx-auto">
            {individualPlans.map((p) => {
              const priceCents = getPriceForCycle(p.id, cycle, prices, p.price_cents);
              const moduleKey = p.modules?.[0] ?? null;
              return (
                <PlanCard
                  key={p.id}
                  title={p.name}
                  description={p.description}
                  priceCents={priceCents}
                  cycle={cycle}
                  modules={p.modules ?? []}
                  isPopular={p.is_popular}
                  isLoading={subscribingId === p.id}
                  onSelect={() => handleSelect(p, moduleKey)}
                />
              );
            })}
          </div>
        )}

        {tab === "objective" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4 max-w-5xl mx-auto">
            {objectives.map((o) => {
              const plan = plans.find((p) => p.id === o.plan_id);
              if (!plan) return null;
              const priceCents = getPriceForCycle(plan.id, cycle, prices, plan.price_cents);
              return (
                <PlanCard
                  key={o.id}
                  title={o.name}
                  description={o.description}
                  priceCents={priceCents}
                  cycle={cycle}
                  modules={o.modules}
                  isLoading={subscribingId === plan.id}
                  onSelect={() => handleSelect(plan, null)}
                />
              );
            })}
          </div>
        )}

        {tab === "total" && totalPlan && (
          <div className="grid gap-6 sm:grid-cols-1 max-w-md mx-auto pt-4">
            <PlanCard
              title={totalPlan.name}
              description={totalPlan.description}
              priceCents={getPriceForCycle(totalPlan.id, cycle, prices, totalPlan.price_cents)}
              cycle={cycle}
              modules={totalPlan.modules ?? []}
              isPopular
              isLoading={subscribingId === totalPlan.id}
              onSelect={() => handleSelect(totalPlan, null)}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
