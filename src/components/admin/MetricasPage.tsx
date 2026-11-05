import PedidosMetricas from '@/components/admin/PedidosMetricas';
import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Percent, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { getNoahFeedbackMetrics, type NoahFeedbackMetrics } from '@/services/admin/noahMetrics';

const PERIODS = [7, 30, 90];
const T_METRICAS = 'M\u00e9tricas';
const T_SUB = 'Vis\u00e3o geral da qualidade do suporte e do uso da plataforma.';
const T_SECAO = 'Suporte Noah \u00b7 Isso ajudou?';
const T_APROV = 'Aprova\u00e7\u00e3o';
const T_NAO = 'N\u00e3o curtidas';
const T_DOWNS = 'Perguntas que receberam "n\u00e3o curtiu"';
const T_VAZIO = 'Nenhuma no per\u00edodo.';

const card = (bd: string) => `rounded-2xl border ${bd} bg-[#111524] p-4`;
const BD = 'border-violet-500/50';
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };
const ITEM = { color: '#e2e8f0', fontSize: 12 };

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: ElementType; tone: string }) {
  return (
    <div className={`${card(BD)} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
    </div>
  );
}

function SuporteMetricas() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<NoahFeedbackMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getNoahFeedbackMetrics(days)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e?.message ?? 'Erro ao carregar'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const up = data?.up ?? 0;
  const down = data?.down ?? 0;
  const total = data?.total ?? 0;
  const approval = total > 0 ? Math.round((up / total) * 100) : null;
  const dash = loading ? '...' : null;

  const rows = useMemo(() => {
    const map = new Map<string, { up: number; down: number }>();
    (data?.daily ?? []).forEach((d) => map.set(String(d.day).slice(0, 10), { up: d.up, down: d.down }));
    const out: { label: string; up: number; down: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = ymd(dt);
      const v = map.get(key) ?? { up: 0, down: 0 };
      out.push({ label: `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`, up: v.up, down: v.down });
    }
    return out;
  }, [data, days]);

  const pie = [
    { name: 'Curtidas', value: up, color: '#10b981' },
    { name: T_NAO, value: down, color: '#f43f5e' },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white"><BarChart3 className="h-6 w-6 text-[#fd8539]" /> {T_METRICAS}</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">{T_SUB}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-700 bg-[#0b0e1a] p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`cursor-pointer rounded-md px-3 py-1 text-[13px] font-semibold transition-colors ${days === p ? 'bg-[#0094eb] text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-[13px] font-bold uppercase tracking-wider text-violet-400">{T_SECAO}</h2>

      {error && <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-[13px] text-rose-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Votos" value={dash ?? String(total)} hint="No per\u00edodo" icon={Users} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Curtidas" value={dash ?? String(up)} icon={ThumbsUp} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label={T_NAO} value={dash ?? String(down)} icon={ThumbsDown} tone="bg-rose-500/15 text-rose-300" />
        <Metric label={T_APROV} value={dash ?? (approval === null ? '-' : `${approval}%`)} icon={Percent} tone="bg-sky-500/15 text-sky-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card(BD)} lg:col-span-2`}>
          <p className="mb-3 text-[15px] font-bold text-white">Votos por dia</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} />
                <Bar dataKey="up" name="Curtidas" stackId="v" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="down" name={T_NAO} stackId="v" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Curtidas</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-400"><span className="h-2 w-2 rounded-full bg-rose-500" /> {T_NAO}</span>
          </div>
        </div>

        <div className={card(BD)}>
          <p className="mb-3 text-[15px] font-bold text-white">{T_APROV}</p>
          <div className="h-56">
            {pie.length === 0 ? (
              <p className="pt-20 text-center text-[13px] text-slate-500">Nenhum voto no per\u00edodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                    {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {pie.map((p) => (
              <span key={p.name} className="inline-flex items-center gap-1.5 text-[13px] text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name} ({p.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={card(BD)}>
        <p className="mb-3 text-[15px] font-bold text-white">{T_DOWNS}</p>
        {(data?.downs ?? []).length === 0 ? (
          <p className="text-[13px] text-slate-500">{T_VAZIO}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Loja</th>
                  <th className="px-3 py-2">Pergunta</th>
                </tr>
              </thead>
              <tbody>
                {(data?.downs ?? []).map((r, i) => (
                  <tr key={i} className="border-b border-slate-800/60 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-semibold text-slate-200">{r.store_name ?? r.store_id.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-slate-100">{r.question ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

type MetricasTab = 'suporte' | 'pedidos';

const METRICAS_TABS: { id: MetricasTab; label: string }[] = [
  { id: 'suporte', label: 'Suporte Noah' },
  { id: 'pedidos', label: 'Pedidos dos lojistas' },
];

export default function MetricasPage() {
  const [tab, setTab] = useState<MetricasTab>('suporte');
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-slate-800">
        {METRICAS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-[15px] font-semibold transition-colors ${
              tab === t.id ? 'border-[#0094eb] text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'suporte' ? <SuporteMetricas /> : <PedidosMetricas />}
    </div>
  );
}
