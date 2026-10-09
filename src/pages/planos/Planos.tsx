import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Eye, Film, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoja } from "@/contexts/LojaContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { VidlyticsPlanCard, type PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getCatalogModules,
  getCatalogShowcase,
  type CatalogModule,
  type CatalogPlan,
} from "@/services/plans/getCatalogShowcase";

const CYCLES: { key: PlanCycle; label: string; badge?: string }[] = [
  { key: "monthly", label: "Mensal" },
  { key: "semiannual", label: "Semestral", badge: "17% OFF" },
  { key: "yearly", label: "Anual", badge: "4 MESES GRÁTIS" },
];

const CONTACT_WPP = (import.meta.env.VITE_CONTACT_WHATSAPP as string | undefined) || "";
const CONTACT_URL = CONTACT_WPP
  ? `https://wa.me/${CONTACT_WPP}?text=${encodeURIComponent("Olá! Quero um plano sob medida do Vidlytics.")}`
  : undefined;

type Cell = boolean | string | { ok: string };

const COMPARE_COLS = ["Starter", "Pro", "Scale"];

const TIER_RANK: Record<string, number> = { starter: 1, pro: 2, scale: 3 };

const ADDONS = [
  { key: "videos_10", icon: Film, title: "+10 Vídeos Ativos", desc: "Adicione mais produtos com vídeos no seu e-commerce", cents: 2990 },
  { key: "views_25k", icon: Eye, title: "+25.000 Visualizações", desc: "Aumente sua franquia mensal para picos de campanhas e tráfego", cents: 3990 },
];

const COMPARE: { group: string; rows: { label: string; v: [Cell, Cell, Cell] }[] }[] = [
  {
    group: "Capacidade e consumo",
    rows: [
      { label: "Vídeos ativos simultâneos", v: ["5 vídeos", "20 vídeos", "50 vídeos"] },
      { label: "Franquia de visualizações mensais", v: ["5.000 views", "25.000 views", "60.000 views"] },
      {
        label: "Formatos liberados (Flutuante, Stories, Carrossel, Grade)",
        v: [{ ok: "Todos" }, { ok: "Todos" }, { ok: "Todos" }],
      },
    ],
  },
  {
    group: "Conversão e inteligência",
    rows: [
      { label: "Botão Comprar via WhatsApp (com link do produto)", v: [true, true, true] },
      { label: "Métricas básicas (visualizações e cliques no vídeo)", v: [true, true, true] },
      { label: "Rastreamento de vendas e faturamento gerado por vídeo", v: [false, true, true] },
      { label: "Remoção da marca d'água (Player 100% White-label)", v: [false, true, true] },
    ],
  },
  {
    group: "Atendimento e suporte",
    rows: [
      { label: "Suporte por e-mail", v: [true, true, true] },
      { label: "Suporte direto via WhatsApp com especialista", v: [false, true, true] },
    ],
  },
];

function CompareCell({ v }: { v: Cell }) {
  if (v === true) return <Check className="mx-auto h-5 w-5 stroke-[3] text-emerald-500" />;
  if (v === false) return <span className="text-slate-300">{"\u2014"}</span>;
  if (typeof v === "string") return <span className="font-bold text-slate-800">{v}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
      <Check className="h-4 w-4 stroke-[3] text-emerald-500" />
      {v.ok}
    </span>
  );
}

export default function Planos() {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [mods, setMods] = useState<CatalogModule[]>([]);
  const [cycle, setCycle] = useState<PlanCycle>("monthly");
  // null = sem plano ativo no Vidlytics; tier pode ser null em assinaturas sem plano dinamico (ex.: vitalicia)
  const [current, setCurrent] = useState<{ tier: string | null } | null>(null);

  useEffect(() => {
    Promise.all([getCatalogShowcase(), getCatalogModules()]).then(([list, m]) => {
      setPlans(list);
      setMods(m);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const sb: any = supabase;
      const { data: sub } = await sb
        .from("subscriptions")
        .select("dynamic_plan_id, status")
        .eq("store_id", storeId)
        .eq("module_key", "vidlytics")
        .eq("is_current", true)
        .in("status", ["active", "past_due", "lifetime"])
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      if (!sub) { setCurrent(null); return; }
      let tier: string | null = null;
      if (sub.dynamic_plan_id) {
        const { data: dp } = await sb.from("dynamic_plans").select("plan_tier").eq("id", sub.dynamic_plan_id).maybeSingle();
        tier = dp?.plan_tier ? String(dp.plan_tier).toLowerCase() : null;
      }
      if (alive) setCurrent({ tier });
    })();
    return () => { alive = false; };
  }, [storeId]);

  function handleAddon(title: string) {
    if (!current) {
      toast.warning("Selecione um plano base primeiro para contratar add-ons.");
      return;
    }
    toast.info(`A contratação de "${title}" será liberada em breve.`);
  }

  const soon = useMemo(() => mods.filter((m) => m.status === "coming_soon"), [mods]);
  const modBySlug = useMemo(() => new Map(mods.map((m) => [m.slug, m])), [mods]);

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
            <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
              {CYCLES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCycle(c.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all",
                    cycle === c.key ? "bg-white text-[#0091ff] shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {c.label}
                  {c.badge && (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                      {c.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {plans.length === 0 ? (
          <p className="text-center text-sm text-slate-500 pt-6">Nenhum plano disponível no momento.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4 max-w-5xl mx-auto">
            {plans.map((p) => {
              const mod = modBySlug.get(p.module_slug);
              const tierKey = String(p.plan_tier || "").toLowerCase();
              const isCurrent = !!current?.tier && current.tier === tierKey;
              const isUpgrade = !!current?.tier && (TIER_RANK[tierKey] ?? 0) > (TIER_RANK[current.tier] ?? 0);
              return (
                <VidlyticsPlanCard
                  key={p.id}
                  tier={String(p.plan_tier || "").toLowerCase()}
                  title={p.plan_name}
                  moduleName={mod?.name || "Vidlytics"}
                  logoUrl={mod?.logo_url ?? null}
                  monthlyCents={p.price_monthly_cents}
                  semiannualCents={p.price_semiannual_cents}
                  annualCents={p.price_annual_cents}
                  cycle={cycle}
                  isPopular={String(p.plan_tier).toLowerCase() === "pro"}
                  isCurrent={isCurrent}
                  ctaLabel={isUpgrade ? "Fazer upgrade" : undefined}
                  contactUrl={CONTACT_URL}
                  onSelect={() => handleSelect(p)}
                />
              );
            })}
          </div>
        )}

        {plans.length > 0 && (
          <section className="max-w-5xl mx-auto space-y-6 pt-8">
            <div className="text-center space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-[#0091ff]">{"\u2014"} COMPARATIVO</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Compare todos os recursos do Vidlytics
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Veja exatamente o que cada plano oferece para acelerar as vendas da sua loja.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-4 text-left" />
                    {COMPARE_COLS.map((c, i) => (
                      <th
                        key={c}
                        className={cn(
                          "px-4 py-4 text-center text-xs font-black uppercase tracking-wider",
                          i === 1 ? "bg-orange-50 text-[#fd8539]" : "text-slate-700"
                        )}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                {COMPARE.map((g) => (
                  <tbody key={g.group} className="divide-y divide-slate-100">
                    <tr className="bg-slate-50">
                      <td colSpan={4} className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label}>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-700">{r.label}</td>
                        {r.v.map((cell, i) => (
                          <td key={i} className={cn("px-4 py-3.5 text-center text-xs", i === 1 && "bg-orange-50/40")}>
                            <CompareCell v={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>

            <div className="space-y-5 pt-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Turbine sua conta com Add-ons</h2>
                <p className="text-sm font-medium text-slate-500">
                  Precisa de mais capacidade sem trocar de plano? Adicione pacotes extras à sua assinatura a qualquer momento.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto">
                {ADDONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div key={a.key} className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0091ff]/10 text-[#0091ff]">
                          <Icon size={22} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{a.title}</h3>
                        <p className="text-xs font-medium leading-relaxed text-slate-500">{a.desc}</p>
                        <p className="text-slate-900">
                          <span className="text-2xl font-black tracking-tight">
                            {(a.cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          <span className="ml-1 text-xs font-bold text-slate-400">/ mês</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddon(a.title)}
                        className="mt-5 w-full rounded-2xl bg-[#0091ff] py-3 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all hover:bg-[#0070f3] hover:scale-[1.02] cursor-pointer"
                      >
                        Contratar Pacote
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
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