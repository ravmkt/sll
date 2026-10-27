import { useCallback, useEffect, useMemo, useState } from 'react';
import PageTour from "@/components/tour/PageTour";
import type { TourStep } from "@/hooks/usePageTour";
import { DollarSign, Eye, MousePointerClick, RefreshCw, ShoppingCart, TrendingUp } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabaseLiveCommerce, supabasePublic } from '@/services/supabaseClients';
import { liveStore } from '@/components/live/LiveTemplatesPage';

type LiveRow = {
  id: string;
  title: string;
  status: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  peak_viewers: number | null;
};
type Ev = { live_id: string; event_type: string; metadata: any; created_at: string };
type Ord = { live_id: string; total_amount: number | string | null; status?: string | null; created_at: string };

const T = {
  title: 'Resultados & M\u00e9tricas',
  sub: 'Desempenho consolidado das suas lives: vendas, audi\u00eancia e cliques em produtos.',
  reload: 'Atualizar',
  err: 'N\u00e3o foi poss\u00edvel carregar os resultados. Tente novamente.',
  kRev: 'Faturamento Total de Lives',
  kOrd: 'Pedidos Aprovados',
  kPeak: 'Pico Hist\u00f3rico de Audi\u00eancia',
  kClk: 'Cliques em Produtos',
  chart: 'Evolu\u00e7\u00e3o de vendas e audi\u00eancia',
  chartEmpty: 'Sem dados no per\u00edodo selecionado.',
  sRev: 'Faturamento (R$)',
  sViews: 'Visualiza\u00e7\u00f5es',
  table: 'Desempenho por live',
  tableEmpty: 'Nenhuma live realizada no per\u00edodo.',
  loading: 'Carregando...',
};

const PERIODS: { k: number; label: string }[] = [
  { k: 7, label: '7 dias' },
  { k: 30, label: '30 dias' },
  { k: 90, label: '90 dias' },
  { k: 0, label: 'Tudo' },
];

const APPROVED = /^(paid|approved|captured|confirmed|completed|aprovado|pago)$/i;
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('sv-SE');
const liveDate = (l: LiveRow) => l.started_at || l.scheduled_at || l.created_at;
const fmtDay = (k: string) => k.slice(8, 10) + '/' + k.slice(5, 7);
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function chunks<A>(arr: A[], n: number): A[][] {
  const out: A[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function loadEvents(ids: string[]): Promise<Ev[]> {
  const db: any = supabaseLiveCommerce;
  const out: Ev[] = [];
  for (const part of chunks(ids, 40)) {
    for (let page = 0; page < 10; page++) {
      const { data, error } = await db
        .from('live_events')
        .select('live_id,event_type,metadata,created_at')
        .in('live_id', part)
        .in('event_type', ['view', 'product_click', 'peak_viewers'])
        .order('created_at', { ascending: true })
        .range(page * 1000, page * 1000 + 999);
      if (error) throw error;
      const rows = (data || []) as Ev[];
      out.push(...rows);
      if (rows.length < 1000) break;
    }
  }
  return out;
}

async function loadOrders(ids: string[]): Promise<Ord[]> {
  const pub: any = supabasePublic;
  const out: Ord[] = [];
  for (const part of chunks(ids, 40)) {
    let res = await pub.from('orders').select('live_id,total_amount,status,created_at').in('live_id', part).limit(5000);
    if (res.error) {
      res = await pub.from('orders').select('live_id,total_amount,created_at').in('live_id', part).limit(5000);
      if (res.error) throw res.error;
    }
    out.push(...((res.data || []) as Ord[]));
  }
  return out;
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' + tone}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-bold tabular-nums text-slate-900">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      </div>
    </div>
  );
}

type SortKey = 'title' | 'date' | 'peak' | 'views' | 'clicks' | 'orders' | 'revenue' | 'ticket';

const RESULTADOS_TOUR: TourStep[] = [
  { element: '[data-tour="resultados-periodo"]', title: 'Per\u00edodo', description: 'Escolha 7, 30, 90 dias ou tudo. Todos os n\u00fameros da p\u00e1gina seguem esse filtro.', side: 'bottom' },
  { element: '[data-tour="resultados-kpis"]', title: 'Indicadores', description: 'Faturamento das lives, pedidos aprovados, pico de audi\u00eancia e cliques em produtos.', side: 'bottom' },
  { element: '[data-tour="resultados-grafico"]', title: 'Evolu\u00e7\u00e3o', description: 'Compare vendas e visualiza\u00e7\u00f5es dia a dia. Clique nas etiquetas para mostrar ou ocultar cada s\u00e9rie.', side: 'top' },
  { element: '[data-tour="resultados-tabela"]', title: 'Desempenho por live', description: 'Clique nos t\u00edtulos das colunas para ordenar e descobrir suas melhores lives.', side: 'top' },
];

export default function LiveResultadosPage() {
  const [lives, setLives] = useState<LiveRow[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [asc, setAsc] = useState(false);
  const [show, setShow] = useState({ rev: true, views: true });
  const toggleSeries = (k: 'rev' | 'views') =>
    setShow((s) => (s[k] && !(k === 'rev' ? s.views : s.rev) ? s : { ...s, [k]: !s[k] }));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const db: any = supabaseLiveCommerce;
      let q = db
        .from('lives')
        .select('id,title,status,scheduled_at,started_at,ended_at,created_at,peak_viewers')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (liveStore.id) q = q.eq('store_id', liveStore.id);
      const { data, error: err } = await q;
      if (err) throw err;
      const list = (data || []) as LiveRow[];
      setLives(list);
      const ids = list.map((l) => l.id);
      if (ids.length === 0) {
        setEvents([]);
        setOrders([]);
      } else {
        const [ev, od] = await Promise.all([loadEvents(ids), loadOrders(ids).catch(() => [] as Ord[])]);
        setEvents(ev);
        setOrders(od);
      }
    } catch (e) {
      console.error('[Resultados]', e);
      setError(T.err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const model = useMemo(() => {
    const cutoff = period > 0 ? Date.now() - period * 86400000 : 0;
    const inPeriod = (iso: string) => !cutoff || new Date(iso).getTime() >= cutoff;

    const eventPeak: Record<string, number> = {};
    events.forEach((e) => {
      if (e.event_type === 'peak_viewers') {
        const c = Number(e.metadata?.count || 0);
        if (c > (eventPeak[e.live_id] || 0)) eventPeak[e.live_id] = c;
      }
    });
    const peakOf = (l: LiveRow) => Math.max(Number(l.peak_viewers) || 0, eventPeak[l.id] || 0);
    const historicPeak = lives.reduce((m, l) => Math.max(m, peakOf(l)), 0);

    const stat: Record<string, { views: number; clicks: number; orders: number; revenue: number }> = {};
    const get = (id: string) => (stat[id] = stat[id] || { views: 0, clicks: 0, orders: 0, revenue: 0 });
    const days: Record<string, { rev: number; views: number }> = {};
    const day = (iso: string) => { const k = dayKey(iso); return (days[k] = days[k] || { rev: 0, views: 0 }); };

    events.forEach((e) => {
      if (!inPeriod(e.created_at)) return;
      if (e.event_type === 'view') { get(e.live_id).views++; day(e.created_at).views++; }
      if (e.event_type === 'product_click') get(e.live_id).clicks++;
    });
    orders.forEach((o) => {
      if (!inPeriod(o.created_at)) return;
      if (o.status != null && !APPROVED.test(String(o.status))) return;
      const v = Number(o.total_amount) || 0;
      const s = get(o.live_id);
      s.orders++;
      s.revenue += v;
      day(o.created_at).rev += v;
    });

    const totals = Object.values(stat).reduce(
      (a, s) => ({ views: a.views + s.views, clicks: a.clicks + s.clicks, orders: a.orders + s.orders, revenue: a.revenue + s.revenue }),
      { views: 0, clicks: 0, orders: 0, revenue: 0 },
    );

    const series: { d: string; label: string; rev: number; views: number }[] = [];
    const keys = Object.keys(days).sort();
    if (keys.length > 0) {
      const start = period > 0 ? new Date(cutoff) : new Date(keys[0] + 'T12:00:00');
      const end = new Date();
      for (let t = new Date(start.getFullYear(), start.getMonth(), start.getDate()), i = 0; t <= end && i < 400; t.setDate(t.getDate() + 1), i++) {
        const k = t.toLocaleDateString('sv-SE');
        series.push({ d: k, label: fmtDay(k), rev: days[k]?.rev || 0, views: days[k]?.views || 0 });
      }
    }

    const rows = lives
      .filter((l) => /^(finished|ended|live)$/i.test(String(l.status)) && inPeriod(liveDate(l)))
      .map((l) => {
        const s = stat[l.id] || { views: 0, clicks: 0, orders: 0, revenue: 0 };
        return {
          id: l.id,
          title: l.title,
          date: liveDate(l),
          live: String(l.status) === 'live',
          peak: peakOf(l),
          views: s.views,
          clicks: s.clicks,
          orders: s.orders,
          revenue: s.revenue,
          ticket: s.orders > 0 ? s.revenue / s.orders : 0,
        };
      });

    return { totals, historicPeak, series, rows };
  }, [lives, events, orders, period]);

  const sorted = useMemo(() => {
    const r = [...model.rows];
    r.sort((a: any, b: any) => {
      const av = sortKey === 'date' ? new Date(a.date).getTime() : a[sortKey];
      const bv = sortKey === 'date' ? new Date(b.date).getTime() : b[sortKey];
      const c = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return asc ? c : -c;
    });
    return r;
  }, [model.rows, sortKey, asc]);

  const sortBy = (k: SortKey) => {
    if (k === sortKey) setAsc(!asc);
    else { setSortKey(k); setAsc(false); }
  };

  const cols: { k: SortKey; label: string; right: boolean }[] = [
    { k: 'title', label: 'Live', right: false },
    { k: 'date', label: 'Data', right: false },
    { k: 'peak', label: 'Pico', right: true },
    { k: 'views', label: T.sViews, right: true },
    { k: 'clicks', label: 'Cliques', right: true },
    { k: 'orders', label: 'Pedidos', right: true },
    { k: 'revenue', label: 'Faturamento', right: true },
    { k: 'ticket', label: 'Ticket m\u00e9dio', right: true },
  ];

  return (
    <div className="w-full space-y-6 p-6">
      <PageTour tourKey="live-resultados" steps={RESULTADOS_TOUR} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <TrendingUp className="h-5 w-5 text-rose-600" /> {T.title}
          </h2>
          <p className="text-sm text-slate-500">{T.sub}</p>
        </div>
        <div data-tour="resultados-periodo" className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.k}
              type="button"
              onClick={() => setPeriod(p.k)}
              className={'rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ' + (period === p.k ? 'border-[#DC2626] bg-[#DC2626] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
            >
              {p.label}
            </button>
          ))}
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            <RefreshCw className={'h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} /> {T.reload}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div data-tour="resultados-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<DollarSign className="h-5 w-5 text-emerald-600" />} tone="bg-emerald-50" label={T.kRev} value={brl(model.totals.revenue)} />
        <Kpi icon={<ShoppingCart className="h-5 w-5 text-sky-600" />} tone="bg-sky-50" label={T.kOrd} value={num(model.totals.orders)} />
        <Kpi icon={<Eye className="h-5 w-5 text-rose-600" />} tone="bg-rose-50" label={T.kPeak} value={num(model.historicPeak)} />
        <Kpi icon={<MousePointerClick className="h-5 w-5 text-amber-600" />} tone="bg-amber-50" label={T.kClk} value={num(model.totals.clicks)} />
      </div>

      <section data-tour="resultados-grafico" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">{T.chart}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={show.rev}
              onClick={() => toggleSeries('rev')}
              className={'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-colors ' + (show.rev ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400 line-through')}
            >
              <span className={'h-2.5 w-2.5 rounded-full ' + (show.rev ? 'bg-emerald-500' : 'bg-slate-300')} /> {T.sRev}
            </button>
            <button
              type="button"
              aria-pressed={show.views}
              onClick={() => toggleSeries('views')}
              className={'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-colors ' + (show.views ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-400 line-through')}
            >
              <span className={'h-2.5 w-2.5 rounded-full ' + (show.views ? 'bg-red-600' : 'bg-slate-300')} /> {T.sViews}
            </button>
          </div>
        </div>
        {model.series.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">{loading ? T.loading : T.chartEmpty}</p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={model.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="resRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickFormatter={(v: number) => 'R$ ' + num(v)} width={80} hide={!show.rev} />
                <YAxis yAxisId="views" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} width={44} hide={!show.views} />
                <Tooltip formatter={(v: any, n: any) => (n === T.sRev ? brl(Number(v)) : num(Number(v)))} />
                <Area yAxisId="rev" type="monotone" dataKey="rev" name={T.sRev} stroke="#10b981" strokeWidth={2} fill="url(#resRev)" hide={!show.rev} />
                <Line yAxisId="views" type="monotone" dataKey="views" name={T.sViews} stroke="#dc2626" strokeWidth={2} dot={false} hide={!show.views} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section data-tour="resultados-tabela" className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{T.table}</h3>
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                {cols.map((c) => (
                  <th key={c.k} className={'cursor-pointer select-none p-3 hover:text-slate-800 ' + (c.right ? 'text-right' : '')} onClick={() => sortBy(c.k)}>
                    {c.label}{sortKey === c.k ? (asc ? ' \u25b2' : ' \u25bc') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="max-w-[320px] truncate p-3 font-bold text-slate-800">
                    {r.title}
                    {r.live && <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white">AO VIVO</span>}
                  </td>
                  <td className="whitespace-nowrap p-3 text-slate-500">{fmtDateTime(r.date)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.peak)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.views)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.clicks)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.orders)}</td>
                  <td className="p-3 text-right font-semibold tabular-nums text-emerald-700">{brl(r.revenue)}</td>
                  <td className="p-3 text-right tabular-nums">{r.orders > 0 ? brl(r.ticket) : '\u2014'}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">{loading ? T.loading : T.tableEmpty}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}