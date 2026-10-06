import React, { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CARD, GOLD_TEXT, LABEL } from "./clubeStyles";

export const REF_RATE = 0.1;
export const REF_PLANS = [
  { key: "basico", name: "Básico", price: 49.9 },
  { key: "pro", name: "Pro", price: 99.9 },
  { key: "master", name: "Master", price: 199.9 },
];

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

type SimPlan = { id: string; name: string; price: number; module: string };

const MODULE_LABELS: Record<string, string> = {
  vidlytics: "Vidlytics",
  live: "Live Commerce",
  livecommerce: "Live Commerce",
  live_commerce: "Live Commerce",
  pdv: "Pdv",
  bundle: "Pacote completo",
};

const moduleLabel = (key: string) =>
  MODULE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/[_-]/g, " ");

const FALLBACK_PLANS: SimPlan[] = REF_PLANS.map((p) => ({
  id: p.key,
  name: `Vidlytics ${p.name}`,
  price: p.price,
  module: "vidlytics",
}));

const choice = (on: boolean) =>
  `rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
    on
      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#F3E2A9]"
      : "border-[#D4AF37]/20 bg-[#111111] text-white/70 hover:border-[#D4AF37]/60"
  }`;

export function ReferralSimulator() {
  const [count, setCount] = useState(5);
  const [plans, setPlans] = useState<SimPlan[]>(FALLBACK_PLANS);
  const [moduleKey, setModuleKey] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, price_cents, modules, sort_order")
        .eq("is_active", true)
        .gt("price_cents", 0)
        .order("sort_order", { ascending: true });
      if (!alive || error || !data || data.length === 0) return;
      setPlans(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price_cents) / 100,
          module: Array.isArray(p.modules) && p.modules.length === 1 ? String(p.modules[0]) : "bundle",
        }))
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  const modules = useMemo(() => Array.from(new Set(plans.map((p) => p.module))), [plans]);
  const modulePlans = plans.filter((p) => p.module === moduleKey);
  const plan = modulePlans.find((p) => p.id === planId) ?? null;

  const monthly = plan ? count * plan.price * REF_RATE : 0;

  return (
    <div className={`${CARD} p-5 space-y-5`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/20">
          <Calculator className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-white">Simule seus ganhos</h3>
          <p className="text-xs text-white/60">Veja quanto você pode receber todo mês indicando mais lojas.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={`${LABEL} block mb-2`}>1. Escolha o módulo indicado</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {modules.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModuleKey(m);
                  setPlanId(null);
                }}
                className={choice(moduleKey === m)}
              >
                {moduleLabel(m)}
              </button>
            ))}
          </div>
        </div>

        {moduleKey && (
          <div>
            <label className={`${LABEL} block mb-2`}>2. Escolha o plano</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {modulePlans.map((p) => (
                <button key={p.id} type="button" onClick={() => setPlanId(p.id)} className={`${choice(planId === p.id)} !py-2 !text-xs`}>
                  {p.name}
                  <span className="block text-[10px] font-medium opacity-70">{brl(p.price)}/mês</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {plan ? (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={LABEL}>Lojas indicadas</label>
              <span className={`text-2xl font-black ${GOLD_TEXT}`}>{count}</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-black/40 border border-[#D4AF37]/20 p-4 text-center">
              <p className={LABEL}>Por mês</p>
              <p className={`mt-1 text-xl font-black ${GOLD_TEXT}`}>{brl(monthly)}</p>
            </div>
            <div className="rounded-xl bg-black/40 border border-[#D4AF37]/20 p-4 text-center">
              <p className={LABEL}>12 meses</p>
              <p className={`mt-1 text-xl font-black ${GOLD_TEXT}`}>{brl(monthly * 12)}</p>
            </div>
            <div className="rounded-xl bg-black/40 border border-[#D4AF37]/20 p-4 text-center">
              <p className={LABEL}>24 meses</p>
              <p className="mt-1 text-xl font-black text-[#FF6A1A]">{brl(monthly * 24)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#D4AF37]/20 p-6 text-center text-sm text-white/60">
          {moduleKey ? "Escolha um plano para ver a simulação." : "Escolha um módulo para começar."}
        </div>
      )}

      <p className="text-[11px] text-white/40">
        Simulação com os preços dos planos ativos e 10% de comissão recorrente, liberada 15 dias após cada
        pagamento confirmado. Não é garantia de ganhos.
      </p>
    </div>
  );
}