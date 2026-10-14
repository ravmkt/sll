import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import type { CatalogCombo } from "@/services/plans/getCatalogShowcase";
import { CYCLE_MONTHS, brl, cycleCents } from "@/components/planos/planosShared";

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
  combos,
  cycle,
  onSelect,
}: {
  combos: CatalogCombo[];
  cycle: PlanCycle;
  onSelect: (c: CatalogCombo) => void;
}) {
  const best = comboMaxPct(combos, cycle);
  return (
    <section className="max-w-5xl mx-auto space-y-6 rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 sm:p-8">
      <div className="text-center space-y-2">
        {best > 0 && (
          <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900">
            Mais vantajoso {"\u2022"} Economize até {best}%
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Combo Completo: todas as ferramentas com desconto exclusivo
        </h2>
        <p className="text-sm font-medium text-slate-500">Um único plano para todos os módulos, com preço menor que o das assinaturas avulsas.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {combos.map((c) => {
          const k = calc(c, cycle);
          return (
            <div
              key={c.id}
              className={cn(
                "relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm",
                c.is_recommended ? "border-[#fd8539] ring-2 ring-[#fd8539]/30" : "border-slate-200"
              )}
            >
              {c.is_recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#fd8539] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  Mais popular
                </span>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">{c.plan_name}</h3>
                  {k.pct > 0 && (
                    <span className="rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-black text-slate-900">Economize {k.pct}%</span>
                  )}
                </div>
                <ul className="space-y-2">
                  {c.modules.map((m) => (
                    <li key={m.slug} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 stroke-[3] text-emerald-500" />
                      <span>
                        <b>{m.name}</b>
                        {m.plan_name ? ` · ${m.plan_name}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <div>
                  {k.save > 0 && (
                    <p className="text-xs font-bold text-slate-400 line-through">{brl(Math.round(k.sum / k.months))}/mês</p>
                  )}
                  <p className="text-slate-900">
                    <span className="text-3xl font-black tracking-tight">{brl(Math.round(k.combo / k.months))}</span>
                    <span className="ml-1 text-xs font-bold text-slate-400">/mês</span>
                  </p>
                  {k.months > 1 && (
                    <p className="text-[11px] font-medium text-slate-500">
                      {brl(k.combo)} a cada {k.months} meses
                    </p>
                  )}
                  {k.save > 0 && (
                    <p className="mt-1 text-xs font-black text-emerald-600">Você economiza {brl(Math.round(k.save / k.months))} por mês</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className={cn(
                  "mt-5 w-full rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all hover:scale-[1.02]",
                  c.is_recommended ? "bg-[#fd8539] hover:bg-[#e8742c]" : "bg-[#0091ff] hover:bg-[#0070f3]"
                )}
              >
                Assinar combo
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}