import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl } from "./ReferralSimulator";
import { CARD, ICON_BOX, LABEL, MUTED, TITLE } from "./clubeStyles";

type Row = { amount: number; created_at: string };

const PERIODS = [
  { key: "30", label: "30 dias", days: 30 },
  { key: "60", label: "60 dias", days: 60 },
  { key: "180", label: "6 meses", days: 180 },
  { key: "365", label: "1 ano", days: 365 },
  { key: "all", label: "Total", days: 0 },
];

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function ReferralEarningsChart({ storeId }: { storeId: string | null | undefined }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("referral_rewards")
        .select("amount, status, created_at")
        .eq("referrer_store_id", storeId)
        .neq("status", "canceled")
        .order("created_at", { ascending: true })
        .limit(5000);
      if (!alive) return;
      setRows(((data as any[]) || []).map((r) => ({ amount: Number(r.amount) || 0, created_at: r.created_at })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [storeId]);

  const { series, total } = useMemo(() => {
    const cfg = PERIODS.find((p) => p.key === period) ?? PERIODS[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start: Date;
    if (cfg.key === "all") {
      start = rows.length ? new Date(rows[0].created_at) : new Date(today.getFullYear(), today.getMonth() - 11, 1);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(today);
      start.setDate(start.getDate() - (cfg.days - 1));
    }

    const daily = cfg.key !== "all" && cfg.days <= 60;
    const sums = new Map<string, number>();
    let sum = 0;
    for (const r of rows) {
      const d = new Date(r.created_at);
      if (d < start) continue;
      const k = daily ? dayKey(d) : monthKey(d);
      sums.set(k, (sums.get(k) || 0) + r.amount);
      sum += r.amount;
    }

    const out: { label: string; valor: number }[] = [];
    if (daily) {
      for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        out.push({ label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, valor: sums.get(dayKey(d)) || 0 });
      }
    } else {
      for (const d = new Date(start.getFullYear(), start.getMonth(), 1); d <= today; d.setMonth(d.getMonth() + 1)) {
        out.push({
          label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
          valor: sums.get(monthKey(d)) || 0,
        });
      }
    }
    return { series: out, total: sum };
  }, [rows, period]);

  return (
    <div className={`${CARD} p-5 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={ICON_BOX}>
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className={TITLE}>Seus ganhos</h3>
            <p className={`text-xs ${MUTED}`}>Comissões geradas no período escolhido.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                period === p.key
                  ? "bg-[#0094eb] border-[#0094eb] text-white"
                  : "bg-white dark:bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0094eb]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={LABEL}>Total no período</p>
        <p className="text-3xl font-black text-[#0094eb]">{brl(total)}</p>
      </div>

      <div className="h-56">
        {loading ? (
          <div className={`h-full flex items-center justify-center text-sm ${MUTED}`}>Carregando ganhos...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="clubeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0094eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0094eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={70}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickFormatter={(v) => `R$ ${Math.round(Number(v))}`}
              />
              <Tooltip
                formatter={(v: any) => [brl(Number(v)), "Ganhos"]}
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, color: "#0f172a" }}
                labelStyle={{ color: "#64748b" }}
              />
              <Area type="monotone" dataKey="valor" stroke="#0094eb" strokeWidth={3} fill="url(#clubeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}