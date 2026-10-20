import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getMarketingSeries, type MktSeries } from '@/services/admin/marketingSeries';
import type { MktKind } from '@/services/admin/marketingAdmin';

const OPTS = [7, 30, 90];

export default function MarketingChart({ kind }: { kind: MktKind }) {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<MktSeries | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setS(null); setErr(null);
    getMarketingSeries(kind, days).then(setS).catch((e) => setErr(e?.message || 'Erro ao carregar o gráfico'));
  }, [kind, days]);

  const second = kind === 'notice'
    ? { key: 'closes', name: 'Dispensados', color: '#f43f5e' }
    : { key: 'clicks', name: 'Cliques', color: '#10b981' };
  const data = (s?.daily ?? []).map((d) => ({ ...d, label: d.day.slice(8, 10) + '/' + d.day.slice(5, 7) }));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-slate-100">Evolução diária</h3>
          <p className="text-[12px] text-slate-500">
            Impressões (eixo esquerdo) e {second.name.toLowerCase()} (eixo direito)
            {s ? ` · ${s.stores} loja(s) alcançada(s) no período` : ''}
          </p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200">
          {OPTS.map((d) => <option key={d} value={d}>{'Últimos ' + d + ' dias'}</option>)}
        </select>
      </div>
      {err ? (
        <p className="text-sm text-rose-400">{err}</p>
      ) : !s ? (
        <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis yAxisId="l" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="l" type="monotone" dataKey="impressions" name="Impressões" stroke="#fd8539" strokeWidth={2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey={second.key} name={second.name} stroke={second.color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}