import React from "react";
import { Check, Crown, Gem, Lock, Medal, Sparkles, Trophy } from "lucide-react";

const LEVELS = [
  {
    n: 10,
    label: "Parceiro Prata",
    name: "Prata",
    Icon: Medal,
    card: "from-slate-500 via-slate-300 to-slate-100",
    text: "text-slate-900",
    glow: "shadow-slate-400/50",
  },
  {
    n: 25,
    label: "Parceiro Ouro",
    name: "Ouro",
    Icon: Crown,
    card: "from-amber-600 via-amber-400 to-yellow-200",
    text: "text-amber-950",
    glow: "shadow-amber-400/60",
  },
  {
    n: 50,
    label: "Parceiro Diamante",
    name: "Diamante",
    Icon: Gem,
    card: "from-blue-700 via-sky-500 to-cyan-300",
    text: "text-white",
    glow: "shadow-sky-500/50",
  },
  {
    n: 100,
    label: "Parceiro Platinum",
    name: "Platinum",
    Icon: Sparkles,
    card: "from-indigo-950 via-violet-700 to-fuchsia-500",
    text: "text-white",
    glow: "shadow-violet-600/50",
  },
];

export function ReferralMilestones({ count }: { count: number }) {
  const next = LEVELS.find((l) => count < l.n);
  const prev = [...LEVELS].reverse().find((l) => count >= l.n);
  const base = prev?.n ?? 0;
  const pct = next ? Math.min(100, Math.round(((count - base) / (next.n - base)) * 100)) : 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Suas metas</h3>
            <p className="text-xs text-slate-500">
              {next
                ? `Faltam ${next.n - count} ${next.n - count === 1 ? "loja" : "lojas"} para ${next.label}.`
                : "Você chegou ao topo. Parabéns!"}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 text-amber-600">
          Prêmios em breve
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#fd8539] to-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {LEVELS.map((l) => {
          const done = count >= l.n;
          const left = Math.max(l.n - count, 0);
          const Icon = l.Icon;
          return (
            <div
              key={l.n}
              className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${l.card} ${l.text} shadow-xl ${l.glow} transition-transform hover:-translate-y-1 ${
                done ? "ring-2 ring-offset-2 ring-green-500" : ""
              }`}
            >
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/40 blur-2xl" />
              <div className="absolute -left-10 -bottom-12 w-28 h-28 rounded-full bg-black/15 blur-2xl" />
              <div className="absolute inset-x-0 top-0 h-px bg-white/70" />

              <div className="relative flex flex-col items-center text-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl bg-white/30 backdrop-blur border border-white/60 flex items-center justify-center shadow-inner">
                  <Icon className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-80">Parceiro</p>
                <p className="text-2xl font-black leading-none">{l.name}</p>
                <p className="text-xs font-bold opacity-90">
                  {l.n} {l.n === 1 ? "loja" : "lojas"}
                </p>

                <span
                  className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    done ? "bg-green-500 text-white" : "bg-black/25 text-white backdrop-blur"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}