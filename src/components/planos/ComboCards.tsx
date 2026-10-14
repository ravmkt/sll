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
  return (
    <section className="max-w-5xl mx-auto space-y-5">
      <div className="text-center space-y-1">
        {best > 0 && (
          <span className="inline-block rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-900">
            Economize até {best}%
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Combos: mais módulos, preço menor</h2>
        <p className="text-sm font-medium text-slate-500">Leve vários módulos em um único plano e pague menos que nas assinaturas avulsas.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((c) => {
          const k = calc(c, cycle);
          return (
            <div
              key={c.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl",
                c.is_recommended ? "border-[#fd8539]" : "border-yellow-400"
              )}
            >
              {k.pct > 0 && (
                <span className="absolute right-0 top-0 rounded-bl-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-900">
                  Economize {k.pct}%
                </span>
              )}

              <div className="flex gap-2">
                {c.modules.map((m) =>
                  m.logo_url ? (
                    <img key={m.slug} src={m.logo_url} alt={m.name} title={m.name} className="h-11 w-11 rounded-xl object-contain" />
                  ) : (
                    <div key={m.slug} title={m.name} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0091ff]/10 font-black text-[#0091ff]">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )
                )}
              </div>

              <h3 className="mt-3 text-base font-black text-slate-900">{c.plan_name}</h3>
              {c.is_recommended && <span className="mt-1 w-fit rounded-full bg-[#fd8539] px-2 py-0.5 text-[10px] font-black uppercase text-white">Mais popular</span>}

              <div className="mt-2">
                {k.save > 0 && (
                  <p className="text-sm font-bold text-red-600 line-through">{brl(Math.round(k.sum / k.months))}/mês</p>
                )}
                <p className="text-slate-900">
                  <span className="text-3xl font-black tracking-tight">{brl(Math.round(k.combo / k.months))}</span>
                  <span className="text-sm font-bold text-slate-500">/mês</span>
                </p>
                <p className="text-xs italic text-slate-500">
                  {CYCLE_TEXT[cycle]}{k.months > 1 ? ` (${brl(k.combo)})` : ""}
                </p>
              </div>

              {k.save > 0 && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  Você economiza {brl(Math.round(k.save / k.months))} por mês ({brl(k.save)} a cada {k.months === 1 ? "mês" : `${k.months} meses`}).
                </p>
              )}

              <ul className="mt-3 space-y-1.5">
                {c.modules.map((m) => (
                  <li key={m.slug} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[3] text-emerald-500" />
                    <span><b>{m.name}</b>{m.plan_name ? ` · ${m.plan_name}` : ""}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="w-full cursor-pointer rounded-full bg-[#3b63fb] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2f52d6]"
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