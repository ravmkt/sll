import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import type { CatalogCombo } from "@/services/plans/getCatalogShowcase";
import { CYCLE_MONTHS, brl, cycleCents } from "@/components/planos/planosShared";

const CYCLE_TEXT: Record<PlanCycle, string> = { monthly: "Cobrado mensalmente", semiannual: "Cobrado a cada 6 meses", yearly: "Cobrado uma vez por ano" };

function calc(c: CatalogCombo, cycle: PlanCycle) {
  const months = CYCLE_MONTHS[cycle];
  const combo = cycleCents(c, cycle);
  const sum = c.modules.reduce(
    (s, m) => s + (cycle === "monthly" ? m.monthly_cents : cycle === "semiannual" ? m.semiannual_cents : m.annual_cents),
    0
  );
  const save = sum > combo ? sum - combo : 0;
  return { months, combo, sum, save, pct: sum > 0 ? Math.round((save / sum) * 100) : 0 };
}

export const comboMaxPct = (combos: CatalogCombo[], cycle: PlanCycle) =>
  Math.max(0, ...combos.map((c) => calc(c, cycle).pct));

export default function ComboCards({
  combos, cycle, onSelect,
}: { combos: CatalogCombo[]; cycle: PlanCycle; onSelect: (c: CatalogCombo) => void }) {
  const best = comboMaxPct(combos, cycle);
  const topId =
    best > 0
      ? combos.find((c) => calc(c, cycle).pct === best)?.id
      : combos.find((c) => c.is_recommended)?.id;

  return (
    <section className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        {best > 0 && (
          <span className="inline-block rounded-full bg-yellow-400 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-slate-900">
            Economize até {best}%
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Combos: mais módulos, preço menor</h2>
        <p className="text-sm font-medium text-slate-500">Leve vários módulos em um único plano e pague menos que nas assinaturas avulsas.</p>
      </div>

      <div className="grid gap-6 pt-3 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((c) => {
          const k = calc(c, cycle);
          const top = c.id === topId;
          return (
            <div
              key={c.id}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl",
                top ? "border-[#fd8539] shadow-lg lg:-translate-y-2" : "border-slate-200"
              )}
            >
              {top && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#fd8539] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow">
                  Mais Vantajoso
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">{c.plan_name}</h3>
                {k.pct > 0 && (
                  <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase text-white">
                    Economize {k.pct}%
                  </span>
                )}
              </div>

              <div className="mt-3">
                {k.save > 0 && (
                  <p className="text-sm font-bold text-red-500 line-through">{brl(Math.round(k.sum / k.months))}/mês</p>
                )}
                <p className="text-slate-900">
                  <span className="text-4xl font-black tracking-tight">{brl(Math.round(k.combo / k.months))}</span>
                  <span className="text-sm font-bold text-slate-500">/mês</span>
                </p>
                <p className="text-xs italic text-slate-500">
                  {CYCLE_TEXT[cycle]}{k.months > 1 ? ` (${brl(k.combo)})` : ""}
                </p>
              </div>

              {k.save > 0 && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  Você economiza {brl(Math.round(k.save / k.months))} por mês ({brl(k.save)} a cada {k.months === 1 ? "mês" : `${k.months} meses`}).
                </p>
              )}

              <p className="mt-4 text-[11px] font-black uppercase tracking-wider text-slate-400">Módulos incluídos</p>
              <ul className="mt-2 space-y-2">
                {c.modules.map((m) => (
                  <li key={m.slug} className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.name} className="h-7 w-7 shrink-0 rounded-lg object-contain" />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0091ff]/10 text-[11px] font-black text-[#0091ff]">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1"><b>{m.name}</b>{m.plan_name ? ` · ${m.plan_name}` : ""}</span>
                    <Check className="h-3.5 w-3.5 shrink-0 stroke-[3] text-emerald-500" />
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={cn(
                    "w-full cursor-pointer rounded-full py-2.5 text-sm font-bold text-white transition-colors",
                    top ? "bg-[#fd8539] hover:bg-[#e8742a]" : "bg-[#3b63fb] hover:bg-[#2f52d6]"
                  )}
                >
                  Economize agora
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}