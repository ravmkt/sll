import React from "react";
import { Check, Trophy } from "lucide-react";

const LEVELS = [
  { n: 10, label: "Parceiro Prata" },
  { n: 25, label: "Parceiro Ouro" },
  { n: 50, label: "Parceiro Diamante" },
  { n: 100, label: "Parceiro Platinum" },
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEVELS.map((l) => {
          const done = count >= l.n;
          return (
            <div
              key={l.n}
              className={`rounded-xl border p-3 text-center ${
                done ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-black ${
                  done ? "bg-green-600 text-white" : "bg-white text-slate-400 border border-slate-200"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : l.n}
              </div>
              <p className={`mt-2 text-xs font-bold ${done ? "text-green-700" : "text-slate-600"}`}>{l.label}</p>
              <p className="text-[10px] text-slate-400">{l.n} {l.n === 1 ? "loja" : "lojas"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}