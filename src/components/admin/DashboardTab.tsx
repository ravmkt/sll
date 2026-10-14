import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Database, Eye, Film, HardDrive, Loader2, Percent, Store, TrendingDown, TrendingUp, Users, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDashboard, getModulesDistribution, listModules, type DashboardData, type ModuleSlice, type SeriesPoint } from '@/services/admin/adminService';
import ConsumptionDetail from '@/components/admin/ConsumptionDetail';
import { HealthAlerts, HealthOrigin, useHealth } from '@/components/admin/DashboardHealth';

const sb: any = supabase;

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
const SELECT = 'h-8 rounded-lg border border-slate-700 bg-[#0b0e1a] px-2 text-[13px] text-slate-200 outline-none focus:border-[#0094eb]';
const ITEM = { color: '#e2e8f0', fontSize: 12 };
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };
const ICON_TONE = 'bg-[#fd8539]/15 text-[#fd8539]';
const MOD_COLORS = ['#fd8539', '#0094eb', '#10b981', '#a855f7', '#f43f5e', '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f97316'];

function Metric({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: ElementType }) {
  return (
    <div className={`${CARD} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_TONE}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function Chart({ title, data, gran, color }: { title: string; data: SeriesPoint[]; gran: 'day' | 'month'; color: string }) {
  const rows = data.map((p) => {
    const [y, m, d] = p.d.split('-');
    return { label: gran === 'month' ? `${m}/${y.slice(2)}` : `${d}/${m}`, v: p.v };
  });
  const gid = `g-${color.replace('#', '')}`;
  return (
    <div className={`${CARD} flex flex-col`}>
      <p className="mb-3 text-[15px] font-bold text-white">{title}</p>
      <div className="relative min-h-[14rem] flex-1">
        <div className="absolute inset-0">
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
              <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => int(Number(v))} />
              <Tooltip contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} formatter={(v: any) => [int(Number(v)), title]} />
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP} className="px-3 py-2">
      <p className="text-[13px] font-bold text-white">{payload[0].name}</p>
      <p className="text-[13px] text-slate-300">{payload[0].value} loja(s)</p>
    </div>
  );
}

type Slice = { name: string; value: number; color: string };

function PieCard({ title, slices, empty }: { title: string; slices: Slice[]; empty: string }) {
  return (
    <div className={CARD}>
      <p className="mb-3 text-[15px] font-bold text-white">{title}</p>
      <div className="h-56">
        {slices.length === 0 ? (
          <p className="pt-20 text-center text-[13px] text-slate-500">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                {slices.map((p) => <Cell key={p.name} fill={p.color} />)}
              </Pie>
              <Tooltip content={<PieTip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {slices.map((p) => (
          <span key={p.name} className="inline-flex items-center gap-1.5 text-[13px] text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name} ({p.value})
          </span>
        ))}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
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
  const [modDist, setModDist] = useState<ModuleSlice[]>([]);
  const [videos, setVideos] = useState<number | null>(null);
  const { h, err: healthErr } = useHealth();

  const range = useMemo(() => {
    if (periodo === 'custom') return { start: cs, end: ce };
    const end = new Date();
    const start = periodo === 'today' ? end : addDays(end, -(Number(periodo) - 1));
    return { start: ymd(start), end: ymd(end) };
  }, [periodo, cs, ce]);

  useEffect(() => {
    listModules().then((m) => { if (m.length) setMods(m); }).catch(() => { /* usa a lista padrao */ });
    getModulesDistribution().then(setModDist).catch(() => setModDist([]));
    sb.schema('vidlytics').from('vid_videos').select('id', { count: 'exact', head: true })
      .then(({ count, error: e }: any) => setVideos(e ? null : count ?? 0));
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
  const pie: Slice[] = s
    ? [
        { name: 'Ativas', value: s.active, color: '#10b981' },
        { name: 'Trial', value: s.trial, color: '#0094eb' },
        { name: 'Inadimplentes', value: s.past_due, color: '#f43f5e' },
        { name: 'Inativas', value: s.inactive, color: '#64748b' },
      ].filter((p) => p.value > 0)
    : [];
  const modPie: Slice[] = modDist.map((m, i) => ({ name: m.name, value: m.stores, color: MOD_COLORS[i % MOD_COLORS.length] }));
  const conv = h && h.trial_ended > 0 ? Math.round((h.trial_converted / h.trial_ended) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Cabecalho unico: os filtros controlam a pagina inteira */}
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
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodo(p.key)}
                className={`cursor-pointer rounded-md px-3 py-1 text-[13px] font-semibold transition-colors ${
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
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[15px] text-rose-300">{error}</div>}
      {healthErr && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-300">Saúde do negócio: {healthErr}</div>}

      {/* Bloco 1: alertas */}
      {h && <HealthAlerts h={h} />}

      {data && s && (
        <>
          {/* Bloco 2: saude do negocio e financas */}
          <Block title="Saúde do negócio">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <Metric label="Lojas ativas" value={int(s.active)} hint={`${int(s.trial)} em trial · ${int(s.inactive)} inativas`} icon={Store} />
              <Metric label="MRR" value={h ? brl(h.mrr_cents) : '—'} hint={h ? `Inclui ${brl(h.addon_mrr_cents)} de add-ons` : 'Recorrência mensal'} icon={TrendingUp} />
              <Metric label="Ticket médio (ARPU)" value={h ? brl(h.arpu_cents) : '—'} hint={h ? `Por loja pagante (${h.active_stores})` : 'Por loja pagante'} icon={Users} />
              <Metric label="Conversão de trial" value={conv === null ? '—' : `${conv}%`} hint={h ? `${h.trial_converted} de ${h.trial_ended} trials (90 dias)` : 'Trials em 90 dias'} icon={Percent} />
              <Metric label="Churn (30 dias)" value={h ? String(h.churn_30d) : '—'} hint="Lojas que cancelaram" icon={TrendingDown} />
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
              <div className="flex xl:col-span-2 [&>div]:flex-1">
                {h ? <HealthOrigin h={h} /> : <div className={`${CARD} flex min-h-[18rem] flex-1 items-center justify-center`}><Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" /></div>}
              </div>
              <PieCard title="Situação das lojas" slices={pie} empty="Sem lojas para exibir." />
              <PieCard title="Lojas por módulo" slices={modPie} empty="Sem assinaturas ativas." />
            </div>
          </Block>

          {/* Bloco 3: infraestrutura e consumo */}
          <Block title="Infraestrutura e consumo">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Metric label="Armazenamento total" value={bytes(data.consumption.storage_bytes)} hint="Acumulado, não varia com o período" icon={HardDrive} />
              <Metric label="Vídeos hospedados" value={videos === null ? '—' : int(videos)} hint="Total na plataforma" icon={Film} />
              <Metric label="Views no período" value={int(data.consumption.views)} hint="Visualizações entregues" icon={Eye} />
              <Metric label="Eventos registrados" value={int(data.consumption.events)} hint="Chamadas ao track-event" icon={Zap} />
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div className="flex xl:col-span-2 [&>div]:flex-1">
                <Chart title="Views" data={data.views_series} gran={data.granularity} color="#0094eb" />
              </div>
              <div className={CARD}>
                <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white">
                  <Database className="h-4 w-4 text-[#fd8539]" /> Maiores consumidores (views)
                </p>
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
              <p className="text-[13px] text-slate-500">O consumo detalhado deste módulo ainda não é medido; os dados acima são do Vidlytics.</p>
            )}
          </Block>

          {/* Bloco 4: engajamento (detalhe de consumo e eventos por tipo) */}
          <Block title="Engajamento e valor gerado">
            <ConsumptionDetail start={range.start} end={range.end} module={module || null} />
          </Block>
        </>
      )}
    </div>
  );
}