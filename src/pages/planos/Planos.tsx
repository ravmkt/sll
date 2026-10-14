import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useLoja } from "@/contexts/LojaContext";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import ComboCards from "@/components/planos/ComboCards";
import ComboPlanoModal from "@/components/planos/ComboPlanoModal";
import ModuleCards from "@/components/planos/ModuleCards";
import ModuloPlanoModal from "@/components/planos/ModuloPlanoModal";
import PlanosFaq from "@/components/planos/PlanosFaq";
import { addonIcon } from "@/components/planos/addonIcon";
import { brl } from "@/components/planos/planosShared";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getCatalogCombos,
  getCatalogModules,
  getCatalogShowcase,
  type CatalogCombo,
  type CatalogModule,
  type CatalogPlan,
} from "@/services/plans/getCatalogShowcase";

const sb: any = supabase;

const CYCLES: { key: PlanCycle; label: string; badge?: string }[] = [
  { key: "monthly", label: "Mensal" },
  { key: "semiannual", label: "Semestral", badge: "17% OFF" },
  { key: "yearly", label: "Anual", badge: "4 MESES GRÁTIS" },
];

type AddonRow = {
  id: string; name: string; description: string | null; price_monthly: number; scope: string;
  target_resource: string | null; upsell_headline: string | null;
};

export default function Planos() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { storeId } = useLoja();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [mods, setMods] = useState<CatalogModule[]>([]);
  const [combos, setCombos] = useState<CatalogCombo[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [cycle, setCycle] = useState<PlanCycle>("monthly");
  const [openMod, setOpenMod] = useState<string | null>(null);
  const [preAddons, setPreAddons] = useState<string[]>([]);
  const [openCombo, setOpenCombo] = useState<CatalogCombo | null>(null);
  const [comboHl, setComboHl] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!combos.length) return;
    let alive = true;
    sb.from("dynamic_plans").select("id,modal_highlights").in("id", combos.map((c) => c.id)).then(({ data, error }: any) => {
      if (!alive || error || !data) return;
      setComboHl(Object.fromEntries((data as any[]).map((r) => [r.id, Array.isArray(r.modal_highlights) ? r.modal_highlights.map(String).filter(Boolean) : []])));
    });
    return () => { alive = false; };
  }, [combos]);
  const [current, setCurrent] = useState<{ tier: string | null } | null>(null);

  useEffect(() => {
    Promise.all([
      getCatalogShowcase(),
      getCatalogModules(),
      getCatalogCombos(),
      sb.from("addons").select("id,name,description,price_monthly,scope,target_resource,upsell_headline").eq("is_active", true).order("price_monthly"),
    ]).then(([list, m, cb, ad]: any[]) => {
      setPlans(list);
      setMods(m);
      setCombos(cb);
      setAddons(((ad?.data || []) as any[]).map((r) => ({ ...r, price_monthly: Number(r.price_monthly) })));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
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

  const modBySlug = useMemo(() => new Map(mods.map((m) => [m.slug, m])), [mods]);
  const soon = useMemo(() => mods.filter((m) => m.status === "coming_soon"), [mods]);
  const byModule = useMemo(() => {
    const g = new Map<string, CatalogPlan[]>();
    plans.forEach((p) => g.set(p.module_slug, [...(g.get(p.module_slug) ?? []), p]));
    return Array.from(g.entries());
  }, [plans]);
  const shownAddons = useMemo(
    () => addons.filter((a) => a.scope === "global" || byModule.some(([s]) => s === a.scope)),
    [addons, byModule]
  );

  // /dashboard/planos?modulo=slug abre direto o modal do modulo
  useEffect(() => {
    const m = params.get("modulo");
    if (!loading && m && byModule.some(([s]) => s === m)) setOpenMod(m);
  }, [loading, params, byModule]);

  function handleCombo(c: CatalogCombo) {
    setOpenCombo(c);
  }

  function handleAddon(a: AddonRow) {
    const slug = a.scope !== "global" && byModule.some(([s]) => s === a.scope)
      ? a.scope
      : byModule.find(([s]) => s === "vidlytics")?.[0] ?? byModule[0]?.[0];
    if (!slug) { toast.warning("Nenhum módulo disponível para este add-on."); return; }
    setPreAddons([a.id]);
    setOpenMod(slug);
  }

  function closeModal() { setOpenMod(null); setPreAddons([]); }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0091ff]" />
        </div>
      </DashboardLayout>
    );
  }

  const openPlans = openMod ? byModule.find(([s]) => s === openMod)?.[1] : undefined;
  const openInfo = openMod ? modBySlug.get(openMod) : undefined;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-12 pb-20">
        <button
          type="button"
          onClick={() => navigate("/dashboard/assinaturas")}
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 transition-colors hover:text-[#0091ff]"
        >
          <ArrowLeft size={16} /> Voltar para Minhas Assinaturas
        </button>

        {/* 1. Topo */}
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Planos e preços do SLL Hub</h1>
          <p className="text-sm font-medium text-slate-500">Comece com 7 dias grátis, sem cartão. Cancele quando quiser.</p>
          <div className="flex justify-center pt-1">
            <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200/50 bg-slate-100 p-1">
              {CYCLES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCycle(c.key)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all",
                    cycle === c.key ? "bg-white text-[#0091ff] shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {c.label}
                  {c.badge && (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">{c.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {plans.length === 0 && combos.length === 0 && (
          <p className="pt-6 text-center text-sm text-slate-500">Nenhum plano disponível no momento.</p>
        )}

        {/* 2. Combos */}
        {combos.length > 0 && <ComboCards combos={combos} cycle={cycle} onSelect={handleCombo} highlights={comboHl} />}

        {/* 3. Modulos avulsos */}
        <ModuleCards byModule={byModule} mods={mods} cycle={cycle} onOpen={(s) => { setPreAddons([]); setOpenMod(s); }} />

        {/* 4. Add-ons */}
        {shownAddons.length > 0 && (
          <section className="mx-auto max-w-6xl space-y-5">
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Turbine sua conta com Add-ons</h2>
              <p className="text-sm font-medium text-slate-500">Mais capacidade sem trocar de plano. Adicione a qualquer momento.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shownAddons.map((a) => {
                const Icon = addonIcon(a);
                return (
                  <div key={a.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0091ff]/10 text-[#0091ff]">
                      <Icon size={22} />
                    </span>
                    <h3 className="text-base font-black text-slate-900">{a.upsell_headline || a.name}</h3>
                    {a.description && <p className="text-xs font-medium leading-relaxed text-slate-500">{a.description}</p>}
                    <p className="mt-auto pt-2 text-slate-900">
                      <span className="text-2xl font-black tracking-tight">{brl(Math.round(a.price_monthly * 100))}</span>
                      <span className="ml-1 text-xs font-bold text-slate-400">/ mês</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddon(a)}
                      className="cursor-pointer rounded-full bg-[#3b63fb] py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#2f52d6]"
                    >
                      Adicionar ao plano
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {soon.length > 0 && (
          <div className="mx-auto max-w-6xl space-y-3">
            <h2 className="text-center text-xs font-black uppercase tracking-wider text-slate-400">Em breve</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {soon.map((m) => (
                <div key={m.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p className="truncate text-sm font-black uppercase text-slate-700">{m.name}</p>
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700">Em breve</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. FAQ */}
        <PlanosFaq />

        {openCombo && (
          <ComboPlanoModal
            key={openCombo.id}
            combo={openCombo}
            initialCycle={cycle}
            highlights={comboHl[openCombo.id] ?? []}
            onClose={() => setOpenCombo(null)}
          />
        )}

        {openMod && openPlans && (
          <ModuloPlanoModal
            key={`${openMod}-${preAddons.join(",")}`}
            slug={openMod}
            name={openInfo?.name || openMod}
            logoUrl={openInfo?.logo_url ?? null}
            plans={openPlans}
            initialCycle={cycle}
            initialAddons={preAddons}
            currentTier={openMod === "vidlytics" ? current?.tier ?? null : null}
            onClose={closeModal}
          />
        )}
      </div>
    </DashboardLayout>
  );
}