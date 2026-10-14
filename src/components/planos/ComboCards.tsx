import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanCycle } from "@/components/planos/VidlyticsPlanCard";
import type { CatalogCombo } from "@/services/plans/getCatalogShowcase";
import { CYCLE_MONTHS, brl, cycleCents } from "@/components/planos/planosShared";

const CYCLE_TEXT: Record<PlanCycle, string> = {
  monthly: "Cobrado mensalmente",
  semiannual: "Cobrado a cada 6 meses",
  yearly: "Cobrado uma vez por ano",
};

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

function Logo({ name, url }: { name: string; url: string | null }) {
  return url ? (
    <img src={url} alt={name} title={name} className="h-14 w-14 shrink-0 rounded-xl object-contain" />
  ) : (
    <span title={name} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0091ff]/10 text-xl font-black text-[#0091ff]">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function ComboCards({
  combos, cycle, onSelect, highlights = {}, summaries = {},
}: {
  combos: CatalogCombo[]; cycle: PlanCycle; onSelect: (c: CatalogCombo) => void;
  highlights?: Record<string, string[]>; summaries?: Record<string, string>;
}) {
  const best = comboMaxPct(combos, cycle);
  const names = Array.from(new Set(combos.flatMap((c) => c.modules.map((m) => m.name))));
  const joined = names.length > 1 ? `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}` : names[0] ?? "os módulos";

  return (
    <section className="mx-auto max-w-6xl space-y-6 rounded-[2rem] border-2 border-yellow-400 bg-gradient-to-b from-yellow-50 to-white p-5 sm:p-8">
      <div className="space-y-2 text-center">
        <span className="inline-block rounded-md bg-yellow-400 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-900">
          Mais vantajoso{best > 0 ? ` • Economize até ${best}%` : ""}
        </span>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Combo completo</h2>
        <p className="text-sm font-medium text-slate-600">
          Leve {joined} juntos e pague menos do que na soma dos planos avulsos.
        </p>
      </div>

      <div className="grid gap-5 pt-2 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((c) => {
          const k = calc(c, cycle);
          const pop = c.is_recommended;
          const summary = (summaries[c.id] || "").trim();
          const list = highlights[c.id]?.length
            ? highlights[c.id].slice(0, 8)
            : c.modules.map((m) => `${m.name}${m.plan_name ? " · " + m.plan_name : ""}`);
          return (
            <div
              key={c.id}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl",
                pop ? "border-[#fd8539] shadow-lg" : "border-slate-200"
              )}
            >
              {pop && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#fd8539] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow">
                  Mais popular
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">{c.plan_name}</h3>
                {k.pct > 0 && (
                  <span className="shrink-0 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase text-slate-900">
                    Economize {k.pct}%
                  </span>
                )}
              </div>

              <div className="mt-2">
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

              {summary && <p className="mt-3 text-xs leading-relaxed text-slate-600">{summary}</p>}

              {k.save > 0 && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  Você economiza {brl(Math.round(k.save / k.months))} por mês
                  {k.months > 1 ? ` (${brl(k.save)} a cada ${k.months} meses)` : ""}.
                </p>
              )}

              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                {list.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 stroke-[3] text-emerald-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  {c.modules.map((m) => <Logo key={m.slug} name={m.name} url={m.logo_url} />)}
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={cn(
                    "w-full cursor-pointer rounded-full py-3 text-xs font-black uppercase tracking-wider text-white transition-colors",
                    pop ? "bg-[#fd8539] hover:bg-[#e8742a]" : "bg-[#3b63fb] hover:bg-[#2f52d6]"
                  )}
                >
                  Assinar combo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}