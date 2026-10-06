import React from "react";
import { Check, Crown, Gem, Lock, Medal, Sparkles, Trophy } from "lucide-react";
import { CARD } from "./clubeStyles";

const LEVELS = [
  {
    n: 10,
    label: "Parceiro Prata",
    name: "Prata",
    Icon: Medal,
    card: "from-slate-500 via-slate-300 to-slate-100",
    text: "text-slate-900",
    glow: "shadow-slate-300/30",
  },
  {
    n: 25,
    label: "Parceiro Ouro",
    name: "Ouro",
    Icon: Crown,
    card: "from-amber-600 via-amber-400 to-yellow-200",
    text: "text-amber-950",
    glow: "shadow-amber-400/40",
  },
  {
    n: 50,
    label: "Parceiro Diamante",
    name: "Diamante",
    Icon: Gem,
    card: "from-blue-700 via-sky-500 to-cyan-300",
    text: "text-white",
    glow: "shadow-sky-400/40",
  },
  {
    n: 100,
    label: "Parceiro Platinum",
    name: "Platinum",
    Icon: Sparkles,
    card: "from-indigo-950 via-violet-700 to-fuchsia-500",
    text: "text-white",
    glow: "shadow-violet-500/40",
  },
];

export function ReferralMilestones({ count }: { count: number }) {
  const next = LEVELS.find((l) => count < l.n);
  const prev = [...LEVELS].reverse().find((l) => count >= l.n);
  const base = prev?.n ?? 0;
  const pct = next ? Math.min(100, Math.round(((count - base) / (next.n - base)) * 100)) : 100;

  return (
    <div className={`${CARD} p-5 space-y-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/20">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white">Suas metas</h3>
            <p className="text-xs text-white/60">
              {next
                ? `Faltam ${next.n - count} ${next.n - count === 1 ? "loja" : "lojas"} para ${next.label}.`
                : "Você chegou ao topo. Parabéns!"}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-[#D4AF37] text-[#D4AF37]">
          Prêmios em breve
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#FF6A1A] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {LEVELS.map((l) => {
          const done = count >= l.n;
          const left = Math.max(l.n - count, 0);
          const Icon = l.Icon;
          return (
            <div
              key={l.n}
              className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${l.card} ${l.text} border border-white/10 shadow-xl ${l.glow} transition-transform hover:-translate-y-1 ${
                done ? "ring-2 ring-offset-2 ring-offset-[#111111] ring-green-500" : ""
              }`}
            >
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/40 blur-2xl" />
              <div className="absolute -left-10 -bottom-12 w-28 h-28 rounded-full bg-black/20 blur-2xl" />
              <div className="absolute inset-x-0 top-0 h-px bg-white/70" />

              <div className="relative flex flex-col items-center text-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur border border-white/50 flex items-center justify-center shadow-inner">
                  <Icon className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] opacity-80">Parceiro</p>
                <p className="text-2xl font-black leading-none tracking-wide">{l.name}</p>
                <p className="text-xs font-semibold tracking-widest opacity-90">
                  {l.n} {l.n === 1 ? "loja" : "lojas"}
                </p>

                <span
                  className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] ${
                    done ? "bg-green-500 text-white" : "bg-black/40 text-white backdrop-blur"
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