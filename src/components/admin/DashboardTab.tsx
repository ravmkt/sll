import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Banknote, Database, Eye, HardDrive, Hourglass, Loader2, Store, TrendingUp, UserCheck, Zap,
} from 'lucide-react';
import { getDashboard, listModules, type DashboardData, type SeriesPoint } from '@/services/admin/adminService';

type Periodo = 'today' | '7' | '30' | '90' | 'custom';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'custom', label: 'Personalizado' },
];

const FALLBACK_MODULES = [
  { slug: 'vidlytics', name: 'Vidlytics' },
  { slug: 'live_commerce', name: 'Live Commerce' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const brl = (cents: number) => ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const int = (n: number) => (n || 0).toLocaleString('pt-BR');
const bytes = (b: number) => {
  if (!b) return '0 MB';
  const mb = b / 1048576;
  return mb < 1024 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
};

const CARD = 'rounded-2xl border border-slate-800 bg-[#111524] p-4';
const SELECT = 'h-8 rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 text-xs text-slate-200 outline-none focus:border-[#0094eb]';
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };

const TONES: Record<string, string> = {
  blue: 'bg-[#0094eb]/15 text-[#0094eb]',
  green: 'bg-emerald-500/15 text-emerald-400',
  red: 'bg-rose-500/15 text-rose-400',
  orange: 'bg-[#fd8539]/15 text-[#fd8539]',
  slate: 'bg-slate-500/15 text-slate-300',
};

function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: ElementType; tone: keyof typeof TONES }) {
  return (
    <div className={`${CARD} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function Chart({ title, data, gran, color, money }: { title: string; data: SeriesPoint[]; gran: 'day' | 'month'; color: string; money?: boolean }) {
  const rows = data.map((p) => {
    const [y, m, d] = p.d.split('-');
    return { label: gran === 'month' ? `${m}/${y.slice(2)}` : `${d}/${m}`, v: p.v };
  });
  const gid = `g-${color.replace('#', '')}`;
  return (
    <div className={CARD}>
      <p className="mb-3 text-sm font-bold text-white">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(v) => (money ? `R$ ${Math.round(Number(v) / 100)}` : int(Number(v)))}
            />
            <Tooltip
              contentStyle={TOOLTIP}
              formatter={(v: any) => [money ? brl(Number(v)) : int(Number(v)), title]}
            />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardTab() {
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [cs, setCs] = useState(() => ymd(addDays(new Date(), -29)));
  const [ce, setCe] = useState(() => ymd(new Date()));
  const [module, setModule] = useState('');
  const [mods, setMods] = useState(FALLBACK_MODULES);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(() => {
    if (periodo === 'custom') return { start: cs, end: ce };
    const end = new Date();
    const start = periodo === 'today' ? end : addDays(end, -(Number(periodo) - 1));
    return { start: ymd(start), end: ymd(end) };
  }, [periodo, cs, ce]);

  useEffect(() => {
    listModules().then((m) => { if (m.length) setMods(m); }).catch(() => { /* usa a lista padrao */ });
  }, []);

  useEffect(() => {
    if (!range.start || !range.end || range.start > range.end) return;
    let alive = true;
    setLoading(true);
    setError('');
    getDashboard(range.start, range.end, module || null)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e?.message || 'Erro ao carregar o dashboard.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range.start, range.end, module]);

  const s = data?.stores;
  const pie = s
    ? [
        { name: 'Ativas', value: s.active, color: '#10b981' },
        { name: 'Trial', value: s.trial, color: '#0094eb' },
        { name: 'Inadimplentes', value: s.past_due, color: '#f43f5e' },
        { name: 'Inativas', value: s.inactive, color: '#64748b' },
      ].filter((p) => p.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Dashboard</h1>
          <p className="text-xs text-slate-500">Visão geral do ecossistema SLL.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periodo === 'custom' && (
            <>
              <input type="date" value={cs} max={ce} onChange={(e) => setCs(e.target.value)} className={SELECT} />
              <span className="text-xs text-slate-500">até</span>
              <input type="date" value={ce} min={cs} onChange={(e) => setCe(e.target.value)} className={SELECT} />
            </>
          )}
          <div className="inline-flex rounded-lg border border-slate-700 bg-[#0b0e1a] p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodo(p.key)}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodo === p.key ? 'bg-[#0094eb] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select value={module} onChange={(e) => setModule(e.target.value)} className={`${SELECT} cursor-pointer`}>
            <option value="">Todos os módulos</option>
            {mods.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </select>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {data && s && (
        <>
          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lojas</h2>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <Metric label="Lojas ativas" value={int(s.active)} hint={`de ${int(s.total)} no total`} icon={Store} tone="green" />
              <Metric label="Em trial" value={int(s.trial)} icon={Hourglass} tone="blue" />
              <Metric label="Inadimplentes" value={int(s.past_due)} icon={AlertTriangle} tone="red" />
              <Metric label="Inativas" value={int(s.inactive)} icon={Store} tone="slate" />
              <Metric label="Indicados ativos" value={int(s.referred_active)} icon={UserCheck} tone="orange" />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Financeiro</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Metric label="Faturamento no período" value={brl(data.revenue)} hint="Faturas pagas" icon={Banknote} tone="green" />
              <Metric label="Total dos inadimplentes" value={brl(data.past_due_total)} hint="Cobrança em aberto" icon={AlertTriangle} tone="red" />
              <Metric label="Faturamento previsto" value={brl(data.forecast)} hint="Recorrência mensal das assinaturas ativas" icon={TrendingUp} tone="blue" />
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Chart title="Faturamento" data={data.revenue_series} gran={data.granularity} color="#10b981" money />
              </div>
              <div className={CARD}>
                <p className="mb-3 text-sm font-bold text-white">Situação das lojas</p>
                <div className="h-56">
                  {pie.length === 0 ? (
                    <p className="pt-20 text-center text-xs text-slate-500">Sem lojas para exibir.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                          {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {pie.map((p) => (
                    <span key={p.name} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name} ({p.value})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Consumo (custos)</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Metric label="Views no período" value={int(data.consumption.views)} icon={Eye} tone="blue" />
              <Metric label="Eventos registrados" value={int(data.consumption.events)} hint="Chamadas ao track-event" icon={Zap} tone="orange" />
              <Metric label="Armazenamento total" value={bytes(data.consumption.storage_bytes)} hint="Acumulado, não varia com o período" icon={HardDrive} tone="slate" />
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Chart title="Views" data={data.views_series} gran={data.granularity} color="#0094eb" />
              </div>
              <div className={CARD}>
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                  <Database className="h-4 w-4 text-[#fd8539]" /> Maiores consumidores
                </p>
                {data.top_stores.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma visualização no período.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.top_stores.map((t, i) => {
                      const max = data.top_stores[0].views || 1;
                      return (
                        <li key={t.id}>
                          <div className="flex justify-between text-xs">
                            <span className="truncate font-semibold text-slate-200">{i + 1}. {t.name}</span>
                            <span className="ml-2 shrink-0 text-slate-400">{int(t.views)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#0094eb] to-[#fd8539]" style={{ width: `${Math.max(4, (t.views / max) * 100)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            {module && module !== 'vidlytics' && (
              <p className="text-[11px] text-slate-500">O consumo detalhado deste módulo ainda não é medido; os dados acima são do Vidlytics.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}