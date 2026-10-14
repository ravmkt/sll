import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import type { CatalogModule, CatalogPlan } from "@/services/plans/getCatalogShowcase";
import { CYCLE_MONTHS, brl, cycleCents } from "@/components/planos/planosShared";

type Props = {
  byModule: [string, CatalogPlan[]][];
  mods: CatalogModule[];
  cycle: PlanCycle;
  onOpen: (slug: string) => void;
};

const perMonth = (p: CatalogPlan, cycle: PlanCycle) => Math.round(cycleCents(p, cycle) / CYCLE_MONTHS[cycle]);
// Ignora texto de teste sem espaços (ex.: "dadsasdasdas...")
const realText = (s: string) => /\s/.test(s) || s.length < 12;

export default function ModuleCards({ byModule, mods, cycle, onOpen }: Props) {
  if (byModule.length === 0) return null;
  const bySlug = new Map(mods.map((m) => [m.slug, m]));

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Ou assine os módulos avulsos</h2>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {byModule.map(([slug, list]) => {
          const mod = bySlug.get(slug) as any;
          const name: string = mod?.name || slug;
          const tiers = [...list].filter((p) => p.price_monthly_cents > 0).sort((a, b) => a.price_monthly_cents - b.price_monthly_cents);
          const from = tiers[0] ? perMonth(tiers[0], cycle) : 0;
          const desc: string = mod?.description || "";
          const raw = Array.isArray(mod?.features) && mod.features.length ? mod.features : Array.isArray(mod?.benefits) ? mod.benefits : [];
          const feats: string[] = raw.map(String).filter(realText).slice(0, 3);
          const badge = list.some((p: any) => p.is_recommended) ? "Mais vendido" : "";

          return (
            <div key={slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg">
              <div className="flex items-start justify-between gap-2">
                {mod?.logo_url ? (
                  <img src={mod.logo_url} alt={name} className="h-14 max-w-[170px] object-contain object-left" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0091ff]/10 text-2xl font-black text-[#0091ff]">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                {badge && (
                  <span className="shrink-0 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase text-slate-900">{badge}</span>
                )}
              </div>

              <h3 className="mt-3 text-lg font-black text-slate-900">{name}</h3>
              {desc && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{desc}</p>}

              {from > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-500">A partir de</p>
                  <p className="text-slate-900">
                    <span className="text-3xl font-black tracking-tight">{brl(from)}</span>
                    <span className="text-sm font-bold text-slate-500">/mês</span>
                  </p>
                </div>
              )}

              {tiers.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {tiers.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <span className="font-bold uppercase text-slate-700">{String(p.plan_tier || p.plan_name)}</span>
                      <span className="font-semibold text-slate-600">{brl(perMonth(p, cycle))}/mês</span>
                    </li>
                  ))}
                </ul>
              )}

              {feats.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {feats.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[3] text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-5">
                <button
                  type="button"
                  disabled={tiers.length === 0}
                  onClick={() => onOpen(slug)}
                  className={cn(
                    "w-full cursor-pointer rounded-full bg-[#3b63fb] py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#2f52d6]",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  Comprar agora
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}