import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useLoja } from "@/contexts/LojaContext";
import { bumpTotal, useUpsells } from "@/components/checkout/OrderBumpCard";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import type { CatalogPlan } from "@/services/plans/getCatalogShowcase";
import { CYCLE_MONTHS, brl, cycleCents } from "@/components/planos/planosShared";

const sb: any = supabase;

const CYCLES: { key: PlanCycle; label: string; note: string }[] = [
  { key: "monthly", label: "Mensal", note: "Cancele a qualquer momento, sem taxa." },
  { key: "semiannual", label: "Semestral", note: "Cobrança única a cada 6 meses." },
  { key: "yearly", label: "Anual", note: "Cobrança única por ano. O melhor preço." },
];

const nf = (n: number) => n.toLocaleString("pt-BR");

// Monta a lista "o que inclui" a partir dos limites do plano (editados no Master)
function bullets(l?: Record<string, any>): string[] {
  if (!l) return [];
  const out: string[] = [];
  if ("max_videos" in l) out.push(l.max_videos === null ? "Vídeos ilimitados" : `Até ${nf(Number(l.max_videos))} vídeos ativos`);
  if ("views" in l) out.push(l.views === null ? "Visualizações ilimitadas" : `Até ${nf(Number(l.views))} visualizações/mês`);
  if ("max_pages" in l) out.push(l.max_pages === null ? "Páginas ilimitadas" : `Até ${nf(Number(l.max_pages))} páginas com vídeo`);
  if ("storage_gb" in l) out.push(l.storage_gb === null ? "Armazenamento ilimitado" : `${nf(Number(l.storage_gb))} GB de armazenamento`);
  if (l.tracking === true) out.push("Rastreamento de vendas por vídeo");
  if (l.badge_removable === true) out.push("Sem marca d'água");
  return out;
}

export default function ModuloPlanoModal({
  slug, name, logoUrl, plans, initialCycle, currentTier, onClose,
}: {
  slug: string; name: string; logoUrl: string | null; plans: CatalogPlan[];
  initialCycle: PlanCycle; currentTier: string | null; onClose: () => void;
}) {
  const navigate = useNavigate();
  const { storeId } = useLoja();

  const sorted = useMemo(() => {
    const priced = plans.filter((p) => p.price_monthly_cents > 0);
    return [...(priced.length ? priced : plans)].sort((a, b) => a.price_monthly_cents - b.price_monthly_cents);
  }, [plans]);
  const tierOf = (p: CatalogPlan) => String(p.plan_tier || "").toLowerCase();
  const isCur = (p: CatalogPlan) => !!currentTier && tierOf(p) === currentTier;

  const [planId, setPlanId] = useState(
    () => (sorted.find((p) => !isCur(p) && tierOf(p) === "pro") ?? sorted.find((p) => !isCur(p)) ?? sorted[0])?.id ?? ""
  );
  const [cycle, setCycle] = useState<PlanCycle>(initialCycle);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [desc, setDesc] = useState("");
  const [incl, setIncl] = useState<string[]>([]);
  const [limits, setLimits] = useState<Record<string, Record<string, any>>>({});
  const items = useUpsells([slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    sb.from("hub_modules").select("*").eq("slug", slug).maybeSingle().then(({ data }: any) => {
      if (!alive || !data) return;
      setDesc(String(data.description || ""));
      const f = Array.isArray(data.features) && data.features.length ? data.features : Array.isArray(data.benefits) ? data.benefits : [];
      setIncl(f.map(String));
    });
    sb.from("dynamic_plans").select("id,limits_config").in("id", sorted.map((p) => p.id)).then(({ data }: any) => {
      if (!alive || !data) return;
      setLimits(Object.fromEntries((data as any[]).map((r) => [r.id, r.limits_config || {}])));
    });
    return () => { alive = false; };
  }, [slug, sorted]);

  const plan = sorted.find((p) => p.id === planId);
  const months = CYCLE_MONTHS[cycle];
  const planCents = plan ? cycleCents(plan, cycle) : 0;
  const addonsCents = Math.round(bumpTotal(items, sel, cycle) * 100);
  const total = planCents + addonsCents;

  const toggle = (id: string) =>
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function proceed() {
    if (!plan) return;
    if (!storeId) { toast.error("Nenhuma loja ativa encontrada."); return; }
    const qs = new URLSearchParams({ plan: plan.id, cycle, module: slug, mods: slug });
    if (sel.size > 0) qs.set("addons", Array.from(sel).join(","));
    navigate(`/dashboard/checkout?${qs.toString()}`);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Planos do ${name}`}>
      <div className="relative grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[1.7fr_1fr]" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 z-10 cursor-pointer rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
          <X className="h-5 w-5" />
        </button>

        {/* Esquerda: modulo + comparativo */}
        <div className="space-y-5 overflow-y-auto bg-slate-50 p-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-12 w-12 rounded-xl object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-lg font-black text-slate-500">{name.charAt(0).toUpperCase()}</div>
            )}
            <h3 className="text-2xl font-black text-slate-900">{name}</h3>
          </div>
          {desc && <p className="text-sm leading-relaxed text-slate-600">{desc}</p>}
          {incl.length > 0 && (
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {incl.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[3] text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Compare e escolha o plano</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {sorted.map((p) => {
                const on = p.id === planId;
                const cur = isCur(p);
                const pop = tierOf(p) === "pro";
                const list = bullets(limits[p.id]);
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border-2 bg-white p-4 transition-colors",
                      on ? "border-[#3b63fb] shadow-md" : "border-slate-200",
                      cur && "opacity-60"
                    )}
                  >
                    {pop && <span className="absolute -top-2.5 left-3 rounded-full bg-[#fd8539] px-2 py-0.5 text-[9px] font-black uppercase text-white">Mais popular</span>}
                    <p className="text-sm font-black uppercase tracking-wide text-slate-900">{String(p.plan_tier || p.plan_name)}</p>
                    <p className="mt-1 text-slate-900">
                      <span className="text-xl font-black">{brl(Math.round(cycleCents(p, cycle) / months))}</span>
                      <span className="text-xs font-bold text-slate-500">/mês</span>
                    </p>
                    <ul className="mt-3 flex-1 space-y-1.5">
                      {list.length === 0 && <li className="text-[11px] text-slate-400">Detalhes do plano em breve.</li>}
                      {list.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-slate-700">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 stroke-[3] text-emerald-500" /> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={cur}
                      onClick={() => setPlanId(p.id)}
                      className={cn(
                        "mt-4 w-full cursor-pointer rounded-full py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed",
                        on ? "bg-[#3b63fb] text-white" : "border border-slate-300 text-slate-700 hover:border-[#3b63fb] hover:text-[#3b63fb]"
                      )}
                    >
                      {cur ? "Plano atual" : on ? "Selecionado" : "Escolher"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Direita: assinatura */}
        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <p className="pr-8 text-sm font-black text-slate-900">Escolha uma assinatura</p>

          <div className="space-y-2">
            {CYCLES.map((c) => {
              const cents = plan ? cycleCents(plan, c.key) : 0;
              const m = CYCLE_MONTHS[c.key];
              const monthlyTotal = plan ? plan.price_monthly_cents * m : 0;
              const save = monthlyTotal - cents;
              const on = cycle === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCycle(c.key)}
                  className={cn("w-full cursor-pointer rounded-xl border-2 p-3 text-left transition-colors", on ? "border-[#3b63fb] bg-blue-50/40" : "border-slate-200 hover:border-slate-300")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{c.label}</span>
                    {c.key !== "monthly" && save > 0 && (
                      <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Economize {Math.round((save / monthlyTotal) * 100)}%</span>
                    )}
                  </div>
                  <p className="text-slate-900">
                    <span className="text-xs text-slate-500">R$ </span>
                    <span className="text-2xl font-black">{brl(Math.round(cents / m)).replace("R$", "").trim()}</span>
                    <span className="text-xs text-slate-500">/mês</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {c.note}{c.key !== "monthly" ? ` Total ${brl(cents)}.` : ""}
                  </p>
                </button>
              );
            })}
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Turbine com add-ons (opcional)</p>
              {items.map((a) => {
                const on = sel.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={cn("flex w-full cursor-pointer items-start gap-2 rounded-xl border-2 border-dashed p-2.5 text-left", on ? "border-[#fd8539] bg-[#fd8539]/10" : "border-[#fd8539]/50 hover:bg-[#fd8539]/5")}
                  >
                    <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2", on ? "border-[#fd8539] bg-[#fd8539] text-white" : "border-slate-300 bg-white")}>
                      {on && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 text-[11px] leading-snug text-slate-700">
                      <b className="flex items-center gap-1 text-slate-900"><Zap size={12} className="text-[#fd8539]" /> {a.upsell_headline || a.name}</b>
                      <span className="text-[#c2571a]">{brl(Math.round(a.price_monthly * 100))}/mês</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-auto space-y-3">
            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
              <div className="flex justify-between"><span className="text-slate-600">{plan?.plan_name ?? "-"}</span><b>{brl(planCents)}</b></div>
              {items.filter((a) => sel.has(a.id)).map((a) => (
                <div key={a.id} className="flex justify-between"><span className="text-slate-600">{a.name}</span><b>{brl(Math.round(a.price_monthly * 100 * months))}</b></div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900"><span>Total</span><span>{brl(total)}</span></div>
              <p className="text-[10px] text-slate-400">Cupom e teste grátis no próximo passo.</p>
            </div>
            <button type="button" onClick={proceed} disabled={!plan} className="w-full cursor-pointer rounded-full bg-[#3b63fb] py-3 text-sm font-bold text-white hover:bg-[#2f52d6] disabled:opacity-50">
              Continuar
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Lock className="h-3 w-3" /> Compra segura</p>
          </div>
        </div>
      </div>
    </div>
  );
}