import { useCallback, useEffect, useMemo, useState } from 'react';
import PageTour from "@/components/tour/PageTour";
import type { TourStep } from "@/hooks/usePageTour";
import { DollarSign, Eye, MessageCircle, MousePointerClick, RefreshCw, ShoppingBag, ShoppingCart, TrendingUp, UserPlus } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabaseStreamSell, supabasePublic } from '@/services/supabaseClients';
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
import { Percent } from 'lucide-react';
type Ev = { live_id: string; event_type: string; metadata: any; created_at: string };
type Ord = { live_id: string; total_amount: number | string | null; status?: string | null; created_at: string };
type Stat = { views: number; clicks: number; buy: number; wa: number; signups: number; orders: number; revenue: number };
type SerKey = 'rev' | 'views' | 'peak' | 'clicks' | 'buy' | 'wa' | 'signups';
type LiveKey = Exclude<SerKey, 'peak'>;

const T = {
  title: 'Resultados & M\u00e9tricas',
  sub: 'Desempenho consolidado das suas lives: vendas, audi\u00eancia e cliques.',
  reload: 'Atualizar',
  err: 'N\u00e3o foi poss\u00edvel carregar os resultados. Tente novamente.',
  kRev: 'Faturamento Total de Lives',
  kOrd: 'Pedidos Aprovados',
  kPeak: 'Pico de Audi\u00eancia',
  kClk: 'Cliques em Produtos',
  kBuy: 'Cliques em Comprar',
  kWa: 'Cliques no WhatsApp',
  kSign: 'Cliques em Cadastro',
  kRate: 'Taxa de Cliques',
  chart: 'Desempenho das lives',
  chartEmpty: 'Sem dados no per\u00edodo selecionado.',
  sRev: 'Faturamento (R$)',
  sViews: 'Visualiza\u00e7\u00f5es',
  table: 'Desempenho por live',
  tableEmpty: 'Nenhuma live realizada no per\u00edodo.',
  loading: 'Carregando...',
};

const SERIES: { k: SerKey; label: string; color: string }[] = [
  { k: 'rev', label: T.sRev, color: '#10b981' },
  { k: 'views', label: T.sViews, color: '#dc2626' },
  { k: 'peak', label: 'Audi\u00eancia (pico)', color: '#7c3aed' },
  { k: 'clicks', label: 'Cliques em produtos', color: '#f59e0b' },
  { k: 'buy', label: 'Comprar', color: '#2563eb' },
  { k: 'wa', label: 'WhatsApp', color: '#84cc16' },
  { k: 'signups', label: 'Cadastros', color: '#ec4899' },
];
const LIVE_METRICS = SERIES.filter((s) => s.k !== 'peak') as { k: LiveKey; label: string; color: string }[];

type Periodo = 'today' | '7' | '30' | 'custom';
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
];

const APPROVED = /^(paid|approved|captured|confirmed|completed|aprovado|pago)$/i;
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('sv-SE');
const liveDate = (l: LiveRow) => l.started_at || l.scheduled_at || l.created_at;
const fmtDay = (k: string) => k.slice(8, 10) + '/' + k.slice(5, 7);
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const emptyStat = (): Stat => ({ views: 0, clicks: 0, buy: 0, wa: 0, signups: 0, orders: 0, revenue: 0 });
const emptyDay = (): Record<SerKey, number> => ({ rev: 0, views: 0, peak: 0, clicks: 0, buy: 0, wa: 0, signups: 0 });

const isBuy = (t: string) => t === 'product_click';
const isWa = (t: string) => t === 'whatsapp_click';
const isSign = (t: string) => t === 'signup_click' || t === 'group_click';
const matchesLive = (t: string, m: LiveKey) =>
  m === 'views' ? t === 'view' : m === 'buy' ? isBuy(t) : m === 'wa' ? isWa(t) : m === 'clicks' ? isBuy(t) || isWa(t) : m === 'signups' ? isSign(t) : false;

function chunks<A>(arr: A[], n: number): A[][] {
  const out: A[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function loadEvents(ids: string[]): Promise<Ev[]> {
  const db: any = supabaseStreamSell;
  const out: Ev[] = [];
  for (const part of chunks(ids, 40)) {
    for (let page = 0; page < 10; page++) {
      const { data, error } = await db
        .from('live_events')
        .select('live_id,event_type,metadata,created_at')
        .in('live_id', part)
        .in('event_type', ['view', 'product_click', 'whatsapp_click', 'signup_click', 'group_click', 'peak_viewers'])
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
    const { data, error } = await pub
      .from('sll_conversions')
      .select('source_id,total,status,created_at')
      .in('source_id', part)
      .eq('status', 'paid')
      .limit(5000);
    if (error) throw error;
    ((data || []) as any[]).forEach((r) =>
      out.push({ live_id: String(r.source_id), total_amount: r.total, status: r.status, created_at: r.created_at }),
    );
  }
  return out;
}

function Kpi({ icon, label, value, tone, hint }: { icon: React.ReactNode; label: string; value: string; tone: string; hint?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' + tone}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-bold tabular-nums text-slate-900">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}

type SortKey = 'title' | 'date' | 'peak' | 'views' | 'clicks' | 'buy' | 'wa' | 'signups' | 'orders' | 'revenue' | 'ticket';

const RESULTADOS_TOUR: TourStep[] = [
  { element: '[data-tour="resultados-periodo"]', title: 'Per\u00edodo', description: 'Escolha o per\u00edodo desejado. Todos os n\u00fameros da p\u00e1gina seguem esse filtro.', side: 'bottom' },
  { element: '[data-tour="resultados-kpis"]', title: 'Indicadores', description: 'Faturamento, pedidos, pico de audi\u00eancia e cliques em produtos, separados em Comprar, WhatsApp e Cadastro.', side: 'bottom' },
  { element: '[data-tour="resultados-grafico"]', title: 'Desempenho das lives', description: 'Combine faturamento, visualiza\u00e7\u00f5es, audi\u00eancia e cliques no mesmo gr\u00e1fico. Clique nas etiquetas para mostrar ou ocultar cada s\u00e9rie.', side: 'top' },
  { element: '[data-tour="resultados-tabela"]', title: 'Desempenho por live', description: 'Clique nos t\u00edtulos das colunas para ordenar e descobrir suas melhores lives.', side: 'top' },
];

export default function LiveResultadosPage() {
  const [lives, setLives] = useState<LiveRow[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [cs, setCs] = useState('');
  const [ce, setCe] = useState('');
  const { fromMs, toMs } = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (periodo === 'custom') {
      const f = cs ? new Date(cs + 'T00:00:00').getTime() : d.getTime() - 29 * 86400000;
      const e = ce ? new Date(ce + 'T23:59:59.999').getTime() : Date.now();
      return { fromMs: f, toMs: Math.max(f, e) };
    }
    if (periodo !== 'today') d.setDate(d.getDate() - (Number(periodo) - 1));
    return { fromMs: d.getTime(), toMs: Date.now() };
  }, [periodo, cs, ce]);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [asc, setAsc] = useState(false);
  const [show, setShow] = useState<Record<SerKey, boolean>>({ rev: true, views: true, peak: false, clicks: true, buy: false, wa: false, signups: false });
  const [mode, setMode] = useState<'sum' | 'live'>('sum');
  const [liveMetric, setLiveMetric] = useState<LiveKey>('views');
  const [selLives, setSelLives] = useState<string[] | null>(null);
  const toggleSeries = (k: SerKey) =>
    setShow((s) => {
      const next = { ...s, [k]: !s[k] };
      return Object.values(next).some(Boolean) ? next : s;
    });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const db: any = supabaseStreamSell;
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
    const cutoff = fromMs;
    const inPeriod = (iso: string) => { const tt = new Date(iso).getTime(); return tt >= cutoff && tt <= toMs; };

    const eventPeak: Record<string, number> = {};
    events.forEach((e) => {
      if (e.event_type === 'peak_viewers') {
        const c = Number(e.metadata?.count || 0);
        if (c > (eventPeak[e.live_id] || 0)) eventPeak[e.live_id] = c;
      }
    });
    const peakOf = (l: LiveRow) => Math.max(Number(l.peak_viewers) || 0, eventPeak[l.id] || 0);
    const periodLives = lives.filter((l) => inPeriod(liveDate(l)));
    const historicPeak = periodLives.reduce((m, l) => Math.max(m, peakOf(l)), 0);

    const stat: Record<string, Stat> = {};
    const get = (id: string) => (stat[id] = stat[id] || emptyStat());
    const days: Record<string, Record<SerKey, number>> = {};
    const day = (iso: string) => { const k = dayKey(iso); return (days[k] = days[k] || emptyDay()); };

    events.forEach((e) => {
      if (!inPeriod(e.created_at)) return;
      const t = e.event_type;
      const s = get(e.live_id);
      if (t === 'view') { s.views++; day(e.created_at).views++; }
      else if (isBuy(t)) { s.buy++; s.clicks++; const d = day(e.created_at); d.buy++; d.clicks++; }
      else if (isWa(t)) { s.wa++; s.clicks++; const d = day(e.created_at); d.wa++; d.clicks++; }
      else if (isSign(t)) { s.signups++; day(e.created_at).signups++; }
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
    periodLives.forEach((l) => {
      const d = day(liveDate(l));
      d.peak = Math.max(d.peak, peakOf(l));
    });

    const totals = Object.values(stat).reduce((a, s) => {
      a.views += s.views; a.clicks += s.clicks; a.buy += s.buy; a.wa += s.wa;
      a.signups += s.signups; a.orders += s.orders; a.revenue += s.revenue;
      return a;
    }, emptyStat());

    const series: ({ d: string; label: string } & Record<SerKey, number>)[] = [];
    const keys = Object.keys(days).sort();
    if (keys.length > 0) {
      const start = new Date(cutoff);
      const end = new Date(toMs);
      for (let t = new Date(start.getFullYear(), start.getMonth(), start.getDate()), i = 0; t <= end && i < 400; t.setDate(t.getDate() + 1), i++) {
        const k = t.toLocaleDateString('sv-SE');
        series.push({ d: k, label: fmtDay(k), ...(days[k] || emptyDay()) });
      }
    }

    const rows = lives
      .filter((l) => /^(finished|ended|live)$/i.test(String(l.status)) && inPeriod(liveDate(l)))
      .map((l) => {
        const s = stat[l.id] || emptyStat();
        return {
          id: l.id,
          title: l.title,
          date: liveDate(l),
          live: String(l.status) === 'live',
          peak: peakOf(l),
          views: s.views,
          clicks: s.clicks,
          buy: s.buy,
          wa: s.wa,
          signups: s.signups,
          orders: s.orders,
          revenue: s.revenue,
          ticket: s.orders > 0 ? s.revenue / s.orders : 0,
        };
      });

    return { totals, historicPeak, series, rows };
  }, [lives, events, orders, fromMs, toMs]);

  const candidates = useMemo(() => {
    const cutoff = fromMs;
    return lives
      .filter((l) => /^(finished|ended|live)$/i.test(String(l.status)) && (new Date(liveDate(l)).getTime() >= cutoff && new Date(liveDate(l)).getTime() <= toMs))
      .sort((a, b) => new Date(liveDate(b)).getTime() - new Date(liveDate(a)).getTime())
      .slice(0, 12);
  }, [lives, fromMs, toMs]);

  const chosen = useMemo(() => {
    const base = selLives ?? candidates.slice(0, 5).map((l) => l.id);
    return candidates.filter((l) => base.includes(l.id)).slice(0, 5);
  }, [candidates, selLives]);

  const toggleLive = (id: string) => {
    const base = chosen.map((l) => l.id);
    setSelLives(base.includes(id) ? base.filter((x) => x !== id) : base.length < 5 ? [...base, id] : base);
  };

  const curves = useMemo(() => {
    const COLORS = ['#dc2626', '#2563eb', '#10b981', '#f59e0b', '#7c3aed'];
    const lines: { key: string; id: string; name: string; color: string }[] = [];
    const perLive: Record<string, Record<number, number>> = {};
    const endMin: Record<string, number> = {};
    let maxMin = 0;
    let grand = 0;
    chosen.forEach((l, i) => {
      const start = new Date(l.started_at || l.scheduled_at || l.created_at).getTime();
      const buckets: Record<number, number> = {};
      let last = 0;
      const add = (iso: string, v: number) => {
        const m = Math.floor((new Date(iso).getTime() - start) / 60000);
        if (m < 0 || m > 720) return;
        buckets[m] = (buckets[m] || 0) + v;
        grand += v;
        if (m > last) last = m;
      };
      if (liveMetric === 'rev') {
        orders.forEach((o) => {
          if (o.live_id === l.id && (o.status == null || APPROVED.test(String(o.status)))) add(o.created_at, Number(o.total_amount) || 0);
        });
      } else {
        events.forEach((e) => { if (e.live_id === l.id && matchesLive(e.event_type, liveMetric)) add(e.created_at, 1); });
      }
      const endAt = l.ended_at ? Math.floor((new Date(l.ended_at).getTime() - start) / 60000) : 0;
      const end = Math.min(720, Math.max(last, endAt, 0));
      perLive[l.id] = buckets;
      endMin[l.id] = end;
      if (end > maxMin) maxMin = end;
      lines.push({ key: 'k' + i, id: l.id, name: (l.title || 'Live') + ' \u00b7 ' + fmtDay(dayKey(liveDate(l))), color: COLORS[i % COLORS.length] });
    });
    const data: any[] = [];
    if (grand > 0) {
      const acc: Record<string, number> = {};
      for (let m = 0; m <= maxMin; m++) {
        const row: any = { min: m };
        lines.forEach((ln) => {
          acc[ln.id] = (acc[ln.id] || 0) + (perLive[ln.id][m] || 0);
          row[ln.key] = m <= endMin[ln.id] ? acc[ln.id] : null;
        });
        data.push(row);
      }
    }
    return { data, lines };
  }, [chosen, events, orders, liveMetric]);

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
    { k: 'clicks', label: 'Cliques em produtos', right: true },
    { k: 'buy', label: 'Comprar', right: true },
    { k: 'wa', label: 'WhatsApp', right: true },
    { k: 'signups', label: 'Cadastros', right: true },
    { k: 'orders', label: 'Pedidos', right: true },
    { k: 'revenue', label: 'Faturamento', right: true },
    { k: 'ticket', label: 'Ticket m\u00e9dio', right: true },
  ];

  const anyCount = SERIES.some((s) => s.k !== 'rev' && show[s.k]);
  const fmtLive = (v: number) => (liveMetric === 'rev' ? brl(v) : num(v));
  const chip = (on: boolean, color: string) =>
    on
      ? { borderColor: color, color, background: color + '1a' }
      : undefined;

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
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  if (p.key === 'custom' && !cs) {
                    const s = new Date();
                    s.setDate(s.getDate() - 29);
                    const f = (x: Date) => x.toLocaleDateString('sv-SE');
                    setCs(f(s));
                    setCe(f(new Date()));
                  }
                  setPeriodo(p.key);
                }}
                className={'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ' + (periodo === p.key ? 'bg-[#DC2626] text-white' : 'text-slate-600 hover:bg-slate-50')}
              >
                {p.label}
              </button>
            ))}
          </div>
          {periodo === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="date" value={cs} max={ce || undefined} onChange={(e) => setCs(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#DC2626]" />
              <span>{'at\u00e9'}</span>
              <input type="date" value={ce} min={cs || undefined} onChange={(e) => setCe(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#DC2626]" />
            </div>
          )}
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
        <Kpi icon={<Percent className="h-5 w-5 text-violet-600" />} tone="bg-violet-50" label={T.kRate} value={model.totals.views > 0 ? (((model.totals.clicks / model.totals.views) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%') : '\u2014'} hint={'Cliques \u00f7 visualiza\u00e7\u00f5es'} />
        <Kpi icon={<MousePointerClick className="h-5 w-5 text-amber-600" />} tone="bg-amber-50" label={T.kClk} value={num(model.totals.clicks)} hint="Comprar + WhatsApp" />
        <Kpi icon={<ShoppingBag className="h-5 w-5 text-blue-600" />} tone="bg-blue-50" label={T.kBuy} value={num(model.totals.buy)} />
        <Kpi icon={<MessageCircle className="h-5 w-5 text-lime-600" />} tone="bg-lime-50" label={T.kWa} value={num(model.totals.wa)} />
        <Kpi icon={<UserPlus className="h-5 w-5 text-pink-600" />} tone="bg-pink-50" label={T.kSign} value={num(model.totals.signups)} hint="Cadastro e grupo" />
      </div>

      <section data-tour="resultados-grafico" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">{T.chart}</h3>
          {mode === 'sum' && (
            <div className="flex flex-wrap items-center gap-2">
              {SERIES.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  aria-pressed={show[s.k]}
                  onClick={() => toggleSeries(s.k)}
                  style={chip(show[s.k], s.color)}
                  className={'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-colors ' + (show[s.k] ? '' : 'border-slate-200 bg-white text-slate-400 line-through')}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: show[s.k] ? s.color : '#cbd5e1' }} /> {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(['sum', 'live'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={'rounded-full border px-3 py-1 text-xs font-bold transition-colors ' + (mode === m ? 'border-[#DC2626] bg-[#DC2626] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
            >
              {m === 'sum' ? 'Soma por dia' : 'Por live'}
            </button>
          ))}
          {mode === 'live' && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-200" />
              {LIVE_METRICS.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  aria-pressed={liveMetric === s.k}
                  onClick={() => setLiveMetric(s.k)}
                  className={'rounded-full border px-3 py-1 text-xs font-bold transition-colors ' + (liveMetric === s.k ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                >
                  {s.label}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-slate-200" />
              {candidates.map((l) => {
                const on = chosen.some((c) => c.id === l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleLive(l.id)}
                    title={on ? 'Ocultar live' : chosen.length >= 5 ? 'Limite de 5 lives' : 'Mostrar live'}
                    className={'rounded-full border px-3 py-1 text-xs font-semibold transition-colors ' + (on ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}
                  >
                    {(l.title || 'Live').slice(0, 18) + ' ' + fmtDay(dayKey(liveDate(l)))}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {mode === 'live' ? (
          curves.data.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">{loading ? T.loading : T.chartEmpty}</p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curves.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="min" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 11 }} tickFormatter={(v: number) => v + ' min'} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={80} tickFormatter={(v: number) => (liveMetric === 'rev' ? 'R$ ' + num(v) : num(v))} />
                  <Tooltip labelFormatter={(v: any) => 'Minuto ' + v} formatter={(v: any, n: any) => [fmtLive(Number(v)), n]} />
                  <Legend />
                  {curves.lines.map((ln) => (
                    <Line key={ln.key} type="monotone" dataKey={ln.key} name={ln.name} stroke={ln.color} strokeWidth={2} dot={false} connectNulls={false} />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )
        ) : model.series.length === 0 ? (
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
                <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} width={44} hide={!anyCount} />
                <Tooltip formatter={(v: any, n: any) => (n === T.sRev ? brl(Number(v)) : num(Number(v)))} />
                <Area yAxisId="rev" type="monotone" dataKey="rev" name={T.sRev} stroke="#10b981" strokeWidth={2} fill="url(#resRev)" hide={!show.rev} />
                {SERIES.filter((s) => s.k !== 'rev').map((s) => (
                  <Line key={s.k} yAxisId="cnt" type="monotone" dataKey={s.k} name={s.label} stroke={s.color} strokeWidth={2} dot={false} hide={!show[s.k]} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section data-tour="resultados-tabela" className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{T.table}</h3>
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-left text-sm">
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
                  <td className="p-3 text-right tabular-nums">{num(r.buy)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.wa)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.signups)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.orders)}</td>
                  <td className="p-3 text-right font-semibold tabular-nums text-emerald-700">{brl(r.revenue)}</td>
                  <td className="p-3 text-right tabular-nums">{r.orders > 0 ? brl(r.ticket) : '\u2014'}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={11} className="p-10 text-center text-slate-400">{loading ? T.loading : T.tableEmpty}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}