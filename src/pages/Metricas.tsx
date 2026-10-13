import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';
import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;
type Periodo = 'today' | '7' | '30' | 'month' | 'custom';
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'month', label: 'Mês atual' },
  { key: 'custom', label: 'Personalizado' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const int = (n: number) => (n || 0).toLocaleString('pt-BR');
const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`;
const num = (v: any) => Number(v) || 0;
const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) { const v = o?.[k]; if (v !== undefined && v !== null) return v; }
  return undefined;
};
const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

const CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm';
const DATE_IN = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#0094eb]';
const BLUE = '#0094eb';
const GREEN = '#059669';

function ChartCard({ title, hint, empty, children }: { title: string; hint: string; empty: boolean; children: ReactNode }) {
  return (
    <div className={`${CARD} p-5`}>
      <h3 className="text-base font-black text-slate-900">{title}</h3>
      <p className="mb-3 text-sm text-slate-600">{hint}</p>
      {empty ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-500">
          Sem dados no período selecionado.
        </div>
      ) : (
        <div className="h-[260px] w-full">{children}</div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function Metricas() {
  const { storeId } = useLoja() as { storeId: string | null };
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [cs, setCs] = useState(() => ymd(addDays(new Date(), -29)));
  const [ce, setCe] = useState(() => ymd(new Date()));
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [retention, setRetention] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [hasVid, setHasVid] = useState(true);

  const range = useMemo(() => {
    const now = new Date();
    if (periodo === 'custom') return { start: cs, end: ce };
    if (periodo === 'today') return { start: ymd(now), end: ymd(now) };
    if (periodo === 'month') return { start: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), end: ymd(now) };
    return { start: ymd(addDays(now, -(Number(periodo) - 1))), end: ymd(now) };
  }, [periodo, cs, ce]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.rpc('get_store_active_modules', { p_store_id: storeId }).then(({ data }: any) => {
      if (alive && Array.isArray(data)) setHasVid(data.includes('vidlytics'));
    });
    return () => { alive = false; };
  }, [storeId]);

  useEffect(() => {
    if (!storeId || range.start > range.end) return;
    let alive = true;
    setLoading(true);
    const S: any = VidlyticsDatabaseService;
    Promise.allSettled([
      S.getOverviewMetrics(storeId, range.start, range.end),
      S.getVideosPerformance(storeId, range.start, range.end),
      S.getRetentionData(storeId, range.start, range.end),
      S.getEventMetrics(storeId, range.start, range.end),
    ]).then((r) => {
      if (!alive) return;
      const ok = (i: number) => (r[i].status === 'fulfilled' ? (r[i] as PromiseFulfilledResult<any>).value : null);
      setOverview(ok(0));
      setVideos(Array.isArray(ok(1)) ? ok(1) : []);
      setRetention(Array.isArray(ok(2)) ? ok(2) : []);
      setEvents(Array.isArray(ok(3)) ? ok(3) : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [storeId, range.start, range.end]);

  const series = useMemo(() => {
    const map = new Map<string, { day: string; label: string; views: number; clicks: number; revenue: number; ctr: number }>();
    for (const r of events) {
      const day = String(pick(r, 'day', 'date', 'event_date', 'created_at') ?? '').slice(0, 10);
      if (!day) continue;
      const type = String(pick(r, 'event_type', 'type', 'event') ?? '').toLowerCase();
      const n = num(pick(r, 'count', 'total', 'events', 'qty', 'quantity')) || 1;
      const cur = map.get(day) ?? { day, label: dayLabel(day), views: 0, clicks: 0, revenue: 0, ctr: 0 };
      cur.views += num(pick(r, 'views', 'plays', 'video_views'));
      cur.clicks += num(pick(r, 'clicks', 'cta_clicks', 'total_clicks'));
      cur.revenue += num(pick(r, 'revenue', 'total_revenue', 'conversion_value'));
      if (type) {
        if (/play|view/.test(type)) cur.views += n;
        else if (/click/.test(type)) cur.clicks += n;
        else if (/purchase|conversion|order/.test(type)) cur.revenue += num(pick(r, 'value', 'amount', 'order_value'));
      }
      map.set(day, cur);
    }
    return [...map.values()]
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((d) => ({ ...d, ctr: d.views > 0 ? Number(((d.clicks / d.views) * 100).toFixed(2)) : 0 }));
  }, [events]);

  const sum = (k: 'views' | 'clicks' | 'revenue') => series.reduce((a, d) => a + d[k], 0);
  const totalRevenue = num(pick(overview, 'totalRevenue', 'revenue')) || sum('revenue');
  const totalViews = num(pick(overview, 'totalViews', 'views', 'totalPlays', 'plays')) || sum('views');
  const totalClicks = num(pick(overview, 'totalClicks', 'clicks')) || sum('clicks');
  const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

  const topVideos = useMemo(
    () =>
      videos
        .map((v) => ({
          name: String(pick(v, 'title', 'name', 'video_title') ?? 'Vídeo').slice(0, 24),
          views: num(pick(v, 'views', 'plays', 'total_views')),
          clicks: num(pick(v, 'clicks', 'total_clicks')),
        }))
        .filter((v) => v.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 8),
    [videos],
  );

  const retentionBars = useMemo(
    () =>
      retention
        .map((r) => ({
          name: String(pick(r, 'title', 'name', 'video_title', 'videoTitle') ?? 'Vídeo').slice(0, 24),
          value: Number(num(pick(r, 'avgRetention', 'avg_retention', 'retention', 'retentionRate', 'retention_rate')).toFixed(1)),
        }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [retention],
  );
  const avgRetention = retentionBars.length ? retentionBars.reduce((a, r) => a + r.value, 0) / retentionBars.length : 0;

  const axis = { fontSize: 11, fill: '#64748b' };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-[#0094eb] hover:underline">
              <ArrowLeft className="h-3 w-3" /> Voltar para a visão geral
            </Link>
            <h2 className="text-lg font-black text-slate-900">Relatório completo de métricas</h2>
            <p className="text-sm text-slate-700">Todos os gráficos analíticos da sua loja em um só lugar.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {periodo === 'custom' && (
              <>
                <input type="date" value={cs} max={ce} onChange={(e) => setCs(e.target.value)} className={DATE_IN} />
                <span className="text-xs text-slate-400">até</span>
                <input type="date" value={ce} min={cs} onChange={(e) => setCe(e.target.value)} className={DATE_IN} />
              </>
            )}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {PERIODOS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriodo(p.key)}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    periodo === p.key ? 'bg-[#0094eb] text-white shadow-sm' : 'text-slate-500 hover:text-[#0094eb]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!hasVid && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
            Ative o Vidlytics para ver as métricas de vídeos neste relatório.
          </p>
        )}

        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Kpi label="Vendas assistidas" value={brl(totalRevenue)} />
            <Kpi label="Visualizações" value={int(totalViews)} />
            <Kpi label="Cliques & interações" value={int(totalClicks)} />
            <Kpi label="CTR médio" value={pct(ctr)} />
            <Kpi label="Retenção média" value={retentionBars.length ? pct(avgRetention) : '—'} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Evolução de vendas assistidas" hint="Receita atribuída aos widgets, por dia." empty={series.every((d) => d.revenue === 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={axis} />
                  <YAxis tick={axis} tickFormatter={(v) => `R$ ${v}`} width={64} />
                  <Tooltip formatter={(v: any) => brl(Number(v))} />
                  <Area type="monotone" dataKey="revenue" name="Vendas" stroke={GREEN} fill={GREEN} fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="CTR diário" hint="Cliques divididos por visualizações, por dia." empty={series.every((d) => d.ctr === 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={axis} />
                  <YAxis tick={axis} tickFormatter={(v) => `${v}%`} width={48} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Line type="monotone" dataKey="ctr" name="CTR" stroke={BLUE} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Visualizações e cliques por dia" hint="Volume diário de reproduções e cliques." empty={series.every((d) => d.views === 0 && d.clicks === 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={axis} />
                  <YAxis tick={axis} width={48} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" name="Visualizações" stroke={BLUE} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clicks" name="Cliques" stroke={GREEN} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Vídeos mais assistidos" hint="Top 8 por visualizações no período." empty={topVideos.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVideos} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={axis} />
                  <YAxis type="category" dataKey="name" tick={axis} width={130} />
                  <Tooltip />
                  <Bar dataKey="views" name="Visualizações" fill={BLUE} radius={[0, 6, 6, 0]} />
                  <Bar dataKey="clicks" name="Cliques" fill={GREEN} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="xl:col-span-2">
              <ChartCard title="Retenção por vídeo" hint="Percentual médio assistido dos vídeos com mais retenção." empty={retentionBars.length === 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retentionBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={axis} />
                    <YAxis tick={axis} tickFormatter={(v) => `${v}%`} width={48} />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="value" name="Retenção" fill={BLUE} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}