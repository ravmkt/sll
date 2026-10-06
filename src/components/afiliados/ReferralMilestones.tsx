import React from "react";
import { Check, Crown, Gem, Lock, Medal, Sparkles, Trophy } from "lucide-react";
import { CARD, ICON_BOX, MUTED, TITLE } from "./clubeStyles";

const LEVELS = [
  { n: 10, name: "Prata", Icon: Medal, card: "from-slate-500 via-slate-300 to-slate-100", text: "text-slate-900" },
  { n: 25, name: "Ouro", Icon: Crown, card: "from-amber-600 via-amber-400 to-yellow-200", text: "text-amber-950" },
  { n: 50, name: "Diamante", Icon: Gem, card: "from-blue-700 via-sky-500 to-cyan-300", text: "text-white" },
  { n: 100, name: "Platinum", Icon: Sparkles, card: "from-indigo-950 via-violet-700 to-fuchsia-500", text: "text-white" },
];

export function ReferralMilestones({ count }: { count: number }) {
  const next = LEVELS.find((l) => count < l.n);
  const prev = [...LEVELS].reverse().find((l) => count >= l.n);
  const base = prev?.n ?? 0;
  const pct = next ? Math.min(100, Math.round(((count - base) / (next.n - base)) * 100)) : 100;

  return (
    <div className={`${CARD} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={ICON_BOX}>
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className={TITLE}>Suas metas</h3>
            <p className={`text-xs ${MUTED}`}>
              {next
                ? `Faltam ${next.n - count} ${next.n - count === 1 ? "loja" : "lojas"} para Parceiro ${next.name}.`
                : "Você chegou ao topo. Parabéns!"}
            </p>
          </div>
        </div>
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#fd8539]/10 text-[#fd8539]">
          Prêmios em breve
        </span>
      </div>

      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#0094eb] to-[#fd8539] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LEVELS.map((l) => {
          const done = count >= l.n;
          const left = Math.max(l.n - count, 0);
          const Icon = l.Icon;
          return (
            <div
              key={l.n}
              className={`relative overflow-hidden rounded-xl p-3 bg-gradient-to-br ${l.card} ${l.text} shadow-md ${
                done ? "ring-2 ring-green-500 ring-offset-2 ring-offset-white dark:ring-offset-[#111524]" : ""
              }`}
            >
              <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/40 blur-2xl" />
              <div className="absolute inset-x-0 top-0 h-px bg-white/70" />
              <div className="relative flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/25 border border-white/50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80">Parceiro</p>
                  <p className="text-lg font-black leading-tight">{l.name}</p>
                  <p className="text-[11px] font-semibold opacity-90">{l.n} lojas</p>
                </div>
              </div>
              <span
                className={`relative mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  done ? "bg-green-500 text-white" : "bg-black/40 text-white"
                }`}
              >
                {done ? (
                  <>
                    <Check className="w-3 h-3" /> Conquistado
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" /> Faltam {left}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}