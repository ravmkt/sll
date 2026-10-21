import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Bot, CheckCircle2, Coins, Database, Eye, Film, HardDrive, Loader2, MessageSquare, Percent,
  Store, TrendingDown, TrendingUp, Users, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDashboard, getModulesDistribution, listModules, type DashboardData, type ModuleSlice, type SeriesPoint } from '@/services/admin/adminService';
import { getConsumption, type Consumption } from '@/services/admin/consumptionService';
import InfraQuotaCards from '@/components/admin/InfraQuotaCards';
import { getNoahCredits, type NoahCredits } from '@/services/admin/noahCreditsService';
import { EventsChart, StorageRanking, bytesFmt } from '@/components/admin/ConsumptionDetail';

const sb: any = supabase;

type Periodo = 'today' | '7' | '30' | '90' | 'custom';
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' }, { key: '7', label: '7 dias' }, { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' }, { key: 'custom', label: 'Personalizado' },
];
const FALLBACK_MODULES = [{ slug: 'vidlytics', name: 'Vidlytics' }, { slug: 'live_commerce', name: 'Stream Sell' }];

type AlertRow = { id: string; name: string; what: string; pct?: number; days?: number };
type Health = {
  mrr_cents: number; addon_mrr_cents: number; active_stores: number; arpu_cents: number;
  churn_30d: number; trial_ended: number; trial_converted: number;
  alerts: { near_limit: AlertRow[]; past_due: AlertRow[]; no_script: AlertRow[] };
  revenue_origin: { d: string; new: number; renewal: number; upfront: number }[];
};
type AiRow = { id: string | null; name: string; calls: number; tokens: number; prompt_tokens: number; completion_tokens: number };
type Ai = { calls: number; prompt_tokens: number; completion_tokens: number; total_tokens: number; stores: number; top: AiRow[] };
type Prices = { inUsd: number; outUsd: number; brl: number };

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const brl = (cents: number) => ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const int = (n: number) => (Number(n) || 0).toLocaleString('pt-BR');

const SELECT = 'h-8 rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 text-[13px] text-slate-200 outline-none focus:border-[#0094eb]';
const ITEM = { color: '#e2e8f0', fontSize: 12 };
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };

// Borda por setor
const BD = {
  alert: 'border-amber-500/50',
  health: 'border-emerald-500/50',
  infra: 'border-sky-500/50',
  engage: 'border-violet-500/50',
};
const card = (bd: string) => `rounded-2xl border ${bd} bg-[#111524] p-4`;

const PRICES_KEY = 'noah_prices_v1';
function loadPrices(): Prices {
  try {
    const p = JSON.parse(localStorage.getItem(PRICES_KEY) || '');
    if (p && [p.inUsd, p.outUsd, p.brl].every((x) => typeof x === 'number' && x >= 0)) return p;
  } catch { /* usa o padrao */ }
  return { inUsd: 0.1, outUsd: 0.4, brl: 5.5 };
}

function Metric({ label, value, hint, icon: Icon, tone, bd }: { label: string; value: string; hint?: string; icon: ElementType; tone: string; bd: string }) {
  return (
    <div className={`${card(bd)} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
    </div>
  );
}

function Title({ children, color }: { children: string; color: string }) {
  return <h2 className={`text-[13px] font-bold uppercase tracking-wider ${color}`}>{children}</h2>;
}

function ViewsChart({ data, gran, bd }: { data: SeriesPoint[]; gran: 'day' | 'month'; bd: string }) {
  const rows = data.map((p) => {
    const [y, m, d] = p.d.split('-');
    return { label: gran === 'month' ? `${m}/${y.slice(2)}` : `${d}/${m}`, v: p.v };
  });
  return (
    <div className={`${card(bd)} flex flex-col`}>
      <p className="mb-3 text-[15px] font-bold text-white">Views</p>
      <div className="relative min-h-[14rem] flex-1">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0094eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0094eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => int(Number(v))} />
              <Tooltip contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} formatter={(v: any) => [int(Number(v)), 'Views']} />
              <Area type="monotone" dataKey="v" stroke="#0094eb" strokeWidth={2.5} fill="url(#g-views)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PieCard({ title, items, empty, bd }: { title: string; items: { name: string; value: number; color: string }[]; empty: string; bd: string }) {
  return (
    <div className={card(bd)}>
      <p className="mb-3 text-[15px] font-bold text-white">{title}</p>
      <div className="h-56">
        {items.length === 0 ? (
          <p className="pt-20 text-center text-[13px] text-slate-500">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                {items.map((p) => <Cell key={p.name} fill={p.color} />)}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => active && payload?.length ? (
                  <div style={TOOLTIP} className="px-3 py-2">
                    <p className="text-[13px] font-bold text-white">{payload[0].name}</p>
                    <p className="text-[13px] text-slate-300">{payload[0].value} loja(s)</p>
                  </div>
                ) : null}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {items.map((p) => (
          <span key={p.name} className="inline-flex items-center gap-1.5 text-[13px] text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name} ({p.value})
          </span>
        ))}
      </div>
    </div>
  );
}

function AlertBox({ title, rows, detail, tone }: { title: string; rows: AlertRow[]; detail: (r: AlertRow) => string; tone: 'danger' | 'warn' }) {
  const open = (id: string) => { window.location.href = `/admin-master?tab=lojas&loja=${id}`; };
  const hot = rows.length > 0;
  const box = !hot
    ? 'border-slate-800 bg-[#0b0e1a] opacity-70'
    : tone === 'danger' ? 'border-rose-500/70 bg-rose-500/10' : 'border-amber-500/70 bg-amber-500/10';
  const badge = !hot ? 'bg-emerald-500/15 text-emerald-300' : tone === 'danger' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-black';
  return (
    <div className={`rounded-xl border p-3 ${box}`}>
      <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-white">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${badge}`}>{hot ? `${rows.length} LOJA(S)` : '0'}</span>
      </p>
      {!hot ? (
        <p className="flex items-center gap-1.5 text-[13px] text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Tudo em dia</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={`${r.id}-${r.what}-${i}`}>
              <button type="button" onClick={() => open(r.id)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-white/5">
                <span className="truncate font-semibold text-slate-100">{r.name}</span>
                <span className={`shrink-0 text-xs font-semibold ${tone === 'danger' ? 'text-rose-300' : 'text-amber-300'}`}>{detail(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AiQuotaCard({ label, value, hint, used, total, extra, ready, icon: Icon, tone, bd }: {
  label: string; value: string; hint: string; used: number; total: number; extra: number; ready: boolean; icon: ElementType; tone: string; bd: string;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const bar = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className={card(bd)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
          <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 border-t border-slate-800 pt-3">
        {!ready ? (
          <p className="text-xs text-slate-500">Franquia indisponível.</p>
        ) : total === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma loja com franquia de IA.</p>
        ) : (
          <>
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-300"><b className="text-white">{int(used)}</b> de {int(total)} mensagens no ciclo</span>
              <span className="font-bold text-slate-200">{pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-600">Franquia dos planos das lojas{extra > 0 ? ` · ${int(extra)} extras em saldo` : ''}</p>
          </>
        )}
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
  const [cons, setCons] = useState<Consumption | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [ai, setAi] = useState<Ai | null>(null);
  const [modDist, setModDist] = useState<ModuleSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [healthErr, setHealthErr] = useState('');
  const [aiErr, setAiErr] = useState('');
  const [infra, setInfra] = useState<any>(null);
  const [credits, setCredits] = useState<NoahCredits[] | null>(null);
  const [creditNames, setCreditNames] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState<{ d: string; new: number; renewal: number; upfront: number }[]>([]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const prices = useMemo(loadPrices, []);

  const range = useMemo(() => {
    if (periodo === 'custom') return { start: cs, end: ce };
    const end = new Date();
    const start = periodo === 'today' ? end : addDays(end, -(Number(periodo) - 1));
    return { start: ymd(start), end: ymd(end) };
  }, [periodo, cs, ce]);

  useEffect(() => { listModules().then((m) => { if (m.length) setMods(m); }).catch(() => {}); }, []);
  useEffect(() => { getModulesDistribution().then(setModDist).catch(() => setModDist([])); }, []);
  useEffect(() => {
    if (!range.start || !range.end || range.start > range.end) return;
    let alive = true;
    sb.rpc('admin_saas_health', { p_start: range.start, p_end: range.end, p_module: module || null })
      .then(({ data: h, error: e }: any) => {
        if (!alive) return;
        if (e) setHealthErr(e.message); else { setHealthErr(''); setHealth(h as Health); }
      });
    return () => { alive = false; };
  }, [range.start, range.end, module]);

  useEffect(() => {
    if (!range.start || !range.end || range.start > range.end) return;
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([
      getDashboard(range.start, range.end, module || null),
      getConsumption(range.start, range.end, null).catch(() => null),
    ])
      .then(([d, c]) => { if (alive) { setData(d); setCons(c); } })
      .catch((e) => { if (alive) setError(e?.message || 'Erro ao carregar o dashboard.'); })
      .finally(() => { if (alive) setLoading(false); });
    sb.rpc('admin_ai_usage', { p_start: range.start, p_end: range.end }).then(({ data: a, error: e }: any) => {
      if (!alive) return;
      if (e) { setAiErr(e.message); setAi(null); } else { setAiErr(''); setAi(a as Ai); }
    });
    return () => { alive = false; };
  }, [range.start, range.end, module]);

  useEffect(() => {
    if (!range.start || !range.end || range.start > range.end) return;
    let alive = true;
    sb.rpc('admin_revenue_origin', { p_start: range.start, p_end: range.end, p_module: module || null })
      .then(({ data: o }: any) => { if (alive) setOrigin(Array.isArray(o) ? o : []); });
    return () => { alive = false; };
  }, [range.start, range.end, module]);

  useEffect(() => {
    if (!range.start || !range.end || range.start > range.end) return;
    let alive = true;
    sb.rpc('admin_dashboard_metrics', { p_start: range.start, p_end: range.end, p_module: null })
      .then(({ data: g }: any) => { if (alive && g) setInfra(g); });
    return () => { alive = false; };
  }, [range.start, range.end]);

  useEffect(() => {
    let alive = true;
    getNoahCredits()
      .then(async (rows) => {
        if (!alive) return;
        setCredits(rows);
        const ids = rows.filter((r) => r.credits_total > 0 && r.credits_used / r.credits_total >= 0.9).map((r) => r.store_id);
        if (!ids.length) { setCreditNames({}); return; }
        const { data: st } = await sb.from('stores').select('id, name').in('id', ids);
        if (alive) setCreditNames(Object.fromEntries((st ?? []).map((x: any) => [x.id, x.name])));
      })
      .catch(() => { if (alive) setCredits(null); });
    return () => { alive = false; };
  }, []);

const s = data?.stores;
  const pie = s ? [
    { name: 'Ativas', value: s.active, color: '#10b981' },
    { name: 'Trial', value: s.trial, color: '#0094eb' },
    { name: 'Inadimplentes', value: s.past_due, color: '#f43f5e' },
    { name: 'Inativas', value: s.inactive, color: '#64748b' },
  ].filter((p) => p.value > 0) : [];
  const COLORS = ['#fd8539', '#0094eb', '#10b981', '#a855f7', '#f43f5e', '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'];
  const modPie = modDist.map((m, i) => ({ name: m.name, value: m.stores, color: COLORS[i % COLORS.length] }));

  const cost = (p: number, c: number) => ((p / 1e6) * prices.inUsd + (c / 1e6) * prices.outUsd) * prices.brl;
  const aiCost = ai ? cost(ai.prompt_tokens, ai.completion_tokens) : 0;
  const aiAvg = ai && ai.stores > 0 ? aiCost / ai.stores : 0;

  const withPlan = (credits ?? []).filter((r) => r.credits_total > 0);
  const aiTotal = withPlan.reduce((n, r) => n + r.credits_total, 0);
  const aiUsed = withPlan.reduce((n, r) => n + Math.min(r.credits_used, r.credits_total), 0);
  const aiExtra = (credits ?? []).reduce((n, r) => n + r.credits_extra, 0);
  const aiNear: AlertRow[] = withPlan
    .filter((r) => r.credits_used / r.credits_total >= 0.9)
    .map((r) => ({ id: r.store_id, name: creditNames[r.store_id] ?? 'Loja', what: 'Noah IA', pct: Math.min(100, Math.round((r.credits_used / r.credits_total) * 100)) }));
  const nearLimit = [...(health?.alerts.near_limit ?? []), ...aiNear];
  const pastDue = health?.alerts.past_due ?? [];
  const noScript = health?.alerts.no_script ?? [];
  const totalAlerts = health ? nearLimit.length + pastDue.length + noScript.length : 0;
  const critical = pastDue.length > 0;
  const conv = health && health.trial_ended > 0 ? Math.round((health.trial_converted / health.trial_ended) * 100) : null;
  const monthly = (new Date(range.end).getTime() - new Date(range.start).getTime()) / 86400000 > 62;
  const series = origin.map((r) => ({
    label: monthly ? `${r.d.slice(5, 7)}/${r.d.slice(2, 4)}` : `${r.d.slice(8, 10)}/${r.d.slice(5, 7)}`, total: r.new + r.renewal + r.upfront, new: r.new, renewal: r.renewal, upfront: r.upfront,
  }));

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b0e1a] px-6 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-black text-white">Dashboard</h1>
          <p className="text-[13px] text-slate-500">Visão geral do ecossistema SLL.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periodo === 'custom' && (
            <>
              <input type="date" value={cs} max={ce} onChange={(e) => setCs(e.target.value)} className={SELECT} />
              <span className="text-[13px] text-slate-500">até</span>
              <input type="date" value={ce} min={cs} onChange={(e) => setCe(e.target.value)} className={SELECT} />
            </>
          )}
          <div className="inline-flex rounded-lg border border-slate-700 bg-[#0b0e1a] p-0.5">
            {PERIODOS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPeriodo(p.key)}
                className={`cursor-pointer rounded-md px-3 py-1 text-[13px] font-semibold transition-colors ${periodo === p.key ? 'bg-[#0094eb] text-white' : 'text-slate-400 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <select value={module} onChange={(e) => setModule(e.target.value)} className={`${SELECT} cursor-pointer`}>
            <option value="">Todos os módulos</option>
            {mods.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </select>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[15px] text-rose-300">{error}</div>}

      {/* ALERTAS */}
      <section className={`space-y-3 rounded-2xl border p-4 ${
        !health ? 'border-slate-700 bg-[#111524]'
        : critical ? 'border-rose-500/70 bg-gradient-to-br from-rose-500/10 to-[#111524] shadow-[0_0_24px_rgba(244,63,94,0.18)]'
        : totalAlerts ? 'border-amber-500/70 bg-gradient-to-br from-amber-500/10 to-[#111524] shadow-[0_0_24px_rgba(245,158,11,0.18)]'
        : 'border-emerald-500/40 bg-[#111524]'}`}>
        <div className="flex flex-wrap items-center gap-2">
          {totalAlerts > 0 ? (
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${critical ? 'bg-rose-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${critical ? 'bg-rose-500' : 'bg-amber-500'}`} />
            </span>
          ) : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          <h2 className="text-sm font-bold text-white">Central de alertas</h2>
          {health && (totalAlerts > 0
            ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${critical ? 'bg-rose-500 text-white' : 'bg-amber-500 text-black'}`}>{totalAlerts} PONTO(S) PEDEM ATENÇÃO</span>
            : <span className="text-[13px] text-emerald-400">Tudo certo por aqui</span>)}
        </div>
        {healthErr ? (
          <p className="text-[13px] text-rose-300">Não foi possível carregar os alertas: {healthErr}</p>
        ) : !health ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <AlertBox tone="warn" title="Perto do limite (90%+)" rows={nearLimit} detail={(r) => `${r.what} ${r.pct}%`} />
              <AlertBox tone="danger" title="Pagamento em atraso" rows={pastDue} detail={(r) => `${r.days ?? 0} dia(s)`} />
              <AlertBox tone="warn" title="Sem script há 48h+" rows={noScript} detail={(r) => `${r.days ?? 0} dia(s) de conta`} />
            </div>
            <p className="text-xs text-slate-500">Quem está perto do limite (inclui a franquia de IA do Noah) é oportunidade de vender upgrade ou pacote extra.</p>
          </>
        )}
      </section>

      {/* SAUDE DO NEGOCIO */}
      <section className="space-y-3">
        <Title color="text-emerald-400">{`Saúde do negócio${module ? ` · ${mods.find((m) => m.slug === module)?.name || module}` : ''}`}</Title>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Metric bd={BD.health} label="Lojas ativas" value={s ? int(s.active) : '—'} hint={s ? `de ${int(s.total)} no total` : ''} icon={Store} tone="bg-emerald-500/15 text-emerald-400" />
          <Metric bd={BD.health} label="Mensalidade recorrente" value={health ? brl(health.mrr_cents) : '—'} hint={health ? `Inclui ${brl(health.addon_mrr_cents)} de add-ons` : ''} icon={TrendingUp} tone="bg-emerald-500/15 text-emerald-400" />
          <Metric bd={BD.health} label="Ticket médio" value={health ? brl(health.arpu_cents) : '—'} hint={health ? `Por loja pagante (${health.active_stores})` : ''} icon={Users} tone="bg-emerald-500/15 text-emerald-400" />
          <Metric bd={BD.health} label="Conversão de trial" value={conv === null ? '—' : `${conv}%`} hint={health ? `${health.trial_converted} de ${health.trial_ended} trials no período` : ''} icon={Percent} tone="bg-emerald-500/15 text-emerald-400" />
          <Metric bd={BD.health} label="Cancelamentos no período" value={health ? String(health.churn_30d) : '—'} hint="Lojas que cancelaram" icon={TrendingDown} tone="bg-emerald-500/15 text-emerald-400" />
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <div className={`${card(BD.health)} xl:col-span-2`}>
            <p className="mb-3 text-[15px] font-bold text-white">Receita por origem</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `R$ ${Math.round(Number(v) / 100)}`} />
                  <Tooltip contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} formatter={(v: any, n: any) => [brl(Number(v)), n]} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                    onClick={(o: any) => setHidden((h) => ({ ...h, [String(o.dataKey)]: !h[String(o.dataKey)] }))}
                    formatter={(v: any, e: any) => <span style={{ opacity: hidden[String(e.dataKey)] ? 0.35 : 1 }}>{v}</span>}
                  />
                  <Area type="monotone" dataKey="total" hide={!!hidden.total} name="Total" stroke="#10b981" strokeWidth={2.5} fill="url(#g-rev)" />
                  <Area type="monotone" dataKey="new" hide={!!hidden.new} name="Assinatura nova" stroke="#0094eb" strokeWidth={1.5} fill="none" />
                  <Area type="monotone" dataKey="renewal" hide={!!hidden.renewal} name="Renovação" stroke="#a855f7" strokeWidth={1.5} fill="none" />
                  <Area type="monotone" dataKey="upfront" hide={!!hidden.upfront} name="Anual/semestral à vista" stroke="#fd8539" strokeWidth={1.5} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-600">Segue o período escolhido. Clique na legenda para ocultar ou mostrar cada curva. Add-on contratado no checkout vai junto com a assinatura.</p>
          </div>
          <PieCard bd={BD.health} title="Situação das lojas" items={pie} empty="Sem lojas para exibir." />
          <PieCard bd={BD.health} title="Lojas por módulo" items={modPie} empty="Sem assinaturas ativas." />
        </div>
      </section>

      {/* INFRAESTRUTURA E CUSTOS */}
      {data && (
        <section className="space-y-3">
          <Title color="text-sky-400">Infraestrutura e custos · sistema todo</Title>
          <InfraQuotaCards />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric bd={BD.infra} label="Armazenamento total" value={bytesFmt((infra?.consumption ?? data.consumption).storage_bytes)} hint="Acumulado, não varia com o período" icon={HardDrive} tone="bg-sky-500/15 text-sky-400" />
            <Metric bd={BD.infra} label="Vídeos hospedados" value={cons ? int(cons.videos_total) : '—'} hint={cons ? `${int(cons.videos_new)} novo(s) no período` : ''} icon={Film} tone="bg-sky-500/15 text-sky-400" />
            <Metric bd={BD.infra} label="Views no período" value={int((infra?.consumption ?? data.consumption).views)} icon={Eye} tone="bg-sky-500/15 text-sky-400" />
            <Metric bd={BD.infra} label="Eventos registrados" value={int((infra?.consumption ?? data.consumption).events)} hint="Chamadas ao track-event" icon={Zap} tone="bg-sky-500/15 text-sky-400" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Metric bd={BD.infra} label="Consumo de IA" value={ai ? money(aiCost) : '—'} hint={ai ? `${int(ai.total_tokens)} tokens (estimativa)` : (aiErr ? 'Rode o SQL admin_ai_usage' : '')} icon={Coins} tone="bg-sky-500/15 text-sky-400" />
            <AiQuotaCard bd={BD.infra} label="Mensagens da IA" value={ai ? int(ai.calls) : '—'} hint="Respostas do Noah no período" used={aiUsed} total={aiTotal} extra={aiExtra} ready={credits !== null} icon={MessageSquare} tone="bg-sky-500/15 text-sky-400" />
            <Metric bd={BD.infra} label="Custo de IA por loja" value={ai ? money(aiAvg) : '—'} hint={ai ? `Média entre ${int(ai.stores)} loja(s) que usaram` : ''} icon={Bot} tone="bg-sky-500/15 text-sky-400" />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <div className="flex xl:col-span-2 [&>div]:flex-1"><ViewsChart bd={BD.infra} data={data.views_series} gran={data.granularity} /></div>
            <div className={card(BD.infra)}>
              <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white"><Database className="h-4 w-4 text-sky-400" /> Maiores consumidores de views</p>
              {data.top_stores.length === 0 ? (
                <p className="text-[13px] text-slate-500">Nenhuma visualização no período.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.top_stores.map((t, i) => {
                    const max = data.top_stores[0].views || 1;
                    return (
                      <li key={t.id}>
                        <div className="flex justify-between text-[13px]">
                          <span className="truncate font-semibold text-slate-200">{i + 1}. {t.name}</span>
                          <span className="ml-2 shrink-0 text-slate-400">{int(t.views)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#0094eb] to-[#06b6d4]" style={{ width: `${Math.max(4, (t.views / max) * 100)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {cons && <StorageRanking d={cons} card={card(BD.infra)} />}
            <div className={card(BD.infra)}>
              <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white"><Bot className="h-4 w-4 text-sky-400" /> Maiores consumidores de IA</p>
              {!ai || ai.top.length === 0 ? (
                <p className="text-[13px] text-slate-500">{aiErr ? 'Consumo de IA indisponível.' : 'Nenhuma chamada de IA no período.'}</p>
              ) : (
                <ul className="space-y-2.5">
                  {ai.top.map((t, i) => {
                    const max = ai.top[0].tokens || 1;
                    return (
                      <li key={`${t.id}-${i}`}>
                        <div className="flex justify-between text-[13px]">
                          <span className="truncate font-semibold text-slate-200">{i + 1}. {t.name}</span>
                          <span className="ml-2 shrink-0 text-slate-400">{int(t.calls)} msg · {money(cost(t.prompt_tokens, t.completion_tokens))}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#0094eb] to-[#06b6d4]" style={{ width: `${Math.max(4, (t.tokens / max) * 100)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-600">Hoje só o Noah (Suporte). Preços do cálculo ficam em Suporte Noah.</p>
            </div>
          </div>
          {module && module !== 'vidlytics' && (
            <p className="text-[13px] text-slate-500">O consumo detalhado deste módulo ainda não é medido; os dados acima são do Vidlytics.</p>
          )}
        </section>
      )}

      {/* ENGAJAMENTO */}
      {cons && (
        <section className="space-y-3">
          <Title color="text-violet-400">Engajamento e valor gerado</Title>
          <EventsChart d={cons} card={card(BD.engage)} />
        </section>
      )}
    </div>
  );
}