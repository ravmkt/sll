import React, { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator } from "lucide-react";

export const REF_RATE = 0.1;
export const REF_PLANS = [
  { key: "basico", name: "Básico", price: 49.9 },
  { key: "pro", name: "Pro", price: 99.9 },
  { key: "master", name: "Master", price: 199.9 },
];

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function ReferralSimulator() {
  const [count, setCount] = useState(5);
  const [planKey, setPlanKey] = useState("pro");
  const plan = REF_PLANS.find((p) => p.key === planKey) ?? REF_PLANS[1];

  const monthly = count * plan.price * REF_RATE;
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

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Plano das lojas indicadas</label>
            <div className="grid grid-cols-3 gap-2">
              {REF_PLANS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPlanKey(p.key)}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                    planKey === p.key
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

      <p className="text-[11px] text-slate-400">
        Simulação com os preços de referência dos planos e 10% de comissão recorrente, liberada 15 dias após cada
        pagamento confirmado. Não é garantia de ganhos.
      </p>
    </div>
  );
}