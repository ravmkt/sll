import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const data = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ mes: `Mês ${i + 1}`, total: monthly * (i + 1) })),
    [monthly]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100">
          <Calculator className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Simule seus ganhos</h3>
          <p className="text-xs text-slate-500">Veja quanto você pode receber todo mês indicando mais lojas.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-2">1. Escolha o módulo indicado</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {modules.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModuleKey(m);
                  setPlanId(null);
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                  moduleKey === m
                    ? "bg-[#fd8539] border-[#fd8539] text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-[#fd8539]"
                }`}
              >
                {moduleLabel(m)}
              </button>
            ))}
          </div>
        </div>

        {moduleKey && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">2. Escolha o plano</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {modulePlans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    planId === p.id
                      ? "bg-[#0094eb] border-[#0094eb] text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-[#0094eb]"
                  }`}
                >
                  {p.name}
                  <span className="block text-[10px] font-medium opacity-80">{brl(p.price)}/mês</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {plan ? (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Lojas indicadas</label>
              <span className="text-2xl font-black text-[#fd8539]">{count}</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-[#fd8539]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-green-50 border border-green-100 p-2">
              <p className="text-[10px] font-bold text-green-700 uppercase">Por mês</p>
              <p className="text-sm font-black text-green-700">{brl(monthly)}</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-2">
              <p className="text-[10px] font-bold text-[#0094eb] uppercase">12 meses</p>
              <p className="text-sm font-black text-[#0094eb]">{brl(monthly * 12)}</p>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-2">
              <p className="text-[10px] font-bold text-[#fd8539] uppercase">24 meses</p>
              <p className="text-sm font-black text-[#fd8539]">{brl(monthly * 24)}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={70}
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={(v) => `R$ ${Math.round(Number(v))}`}
              />
              <Tooltip formatter={(v: any) => [brl(Number(v)), "Acumulado"]} />
              <Area type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={3} fill="url(#refGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {moduleKey ? "Escolha um plano para ver a simulação." : "Escolha um módulo para começar."}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Simulação com os preços dos planos ativos e 10% de comissão recorrente, liberada 15 dias após cada
        pagamento confirmado. Não é garantia de ganhos.
      </p>
    </div>
  );
}