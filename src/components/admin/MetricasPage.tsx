import StreamSellMetricas from '@/components/admin/StreamSellMetricas';
import { LojaBar, LojaProvider } from '@/components/admin/MetricasLoja';
import { PeriodoBar, PeriodoProvider, useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';
import VisaoGeralMetricas from '@/components/admin/VisaoGeralMetricas';
import { ReceitaMetricas, SaudeMetricas } from '@/components/admin/MetricasEtapa3';
import MetricasEtapa4 from '@/components/admin/MetricasEtapa4';
import IaCustoMetricas from '@/components/admin/IaCustoMetricas';
import NoahTemasMetricas from '@/components/admin/NoahTemasMetricas';
import AtivacaoMetricas from '@/components/admin/AtivacaoMetricas';
import VidlyticsMetricas from '@/components/admin/VidlyticsMetricas';
import PedidosMetricas from '@/components/admin/PedidosMetricas';
import NegocioMetricas from '@/components/admin/NegocioMetricas';
import NpsMetricas from '@/components/admin/NpsMetricas';
import { useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Percent, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { getNoahFeedbackMetrics, type NoahFeedbackMetrics } from '@/services/admin/noahMetrics';

const T_METRICAS = 'Métricas';
const T_SUB = 'Visão geral da qualidade do suporte e do uso da plataforma.';
const T_SECAO = 'Suporte Noah · Isso ajudou?';
const T_APROV = 'Aprovação';
const T_NAO = 'Não curtidas';
const T_DOWNS = 'Perguntas que receberam "não curtiu"';
const T_VAZIO = 'Nenhuma no período.';

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
  const periodo = useMetricasPeriodo();
  const days = periodo.days;
  const [data, setData] = useState<NoahFeedbackMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getNoahFeedbackMetrics(days, periodo.mode === 'custom' ? { start: periodo.start, end: periodo.end } : undefined)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e?.message ?? 'Erro ao carregar'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days, periodo.mode, periodo.start, periodo.end]);

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
      const dt = periodo.mode === 'custom' ? new Date(periodo.end + 'T12:00:00') : new Date();
      dt.setDate(dt.getDate() - i);
      const key = ymd(dt);
      const v = map.get(key) ?? { up: 0, down: 0 };
      out.push({ label: `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`, up: v.up, down: v.down });
    }
    return out;
  }, [data, days, periodo.mode, periodo.end]);

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
      </div>

      <h2 className="text-[13px] font-bold uppercase tracking-wider text-violet-400">{T_SECAO}</h2>

      {error && <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-[13px] text-rose-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Votos" value={dash ?? String(total)} hint="No período" icon={Users} tone="bg-violet-500/15 text-violet-300" />
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
              <p className="pt-20 text-center text-[13px] text-slate-500">Nenhum voto no período.</p>
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

type Sub = { id: string; label: string; rpcs: string[]; global?: boolean; render: () => ReactNode };
type Aba = { id: string; label: string; subs: Sub[] };

const ABAS: Aba[] = [
  {
    id: 'visao', label: 'Vis\u00e3o geral',
    subs: [{ id: 'geral', label: 'Vis\u00e3o geral', rpcs: ['admin_saas_health', 'admin_streamsell_metrics', 'admin_vidlytics_metrics', 'admin_nps_results', 'admin_noah_feedback_metrics'], render: () => <VisaoGeralMetricas /> }],
  },
  {
    id: 'receita', label: 'Receita',
    subs: [
      { id: 'negocio', label: 'Receita e cancelamentos', rpcs: ['admin_saas_health', 'admin_revenue_origin'], render: () => <NegocioMetricas /> },
      { id: 'faturas', label: 'Faturas e inadimpl\u00eancia', rpcs: ['admin_receita_metrics'], render: () => <ReceitaMetricas /> },
    ],
  },
  {
    id: 'modulos', label: 'M\u00f3dulos',
    subs: [
      { id: 'streamsell', label: 'Stream Sell', rpcs: ['admin_streamsell_metrics'], render: () => <StreamSellMetricas /> },
      { id: 'vidlytics', label: 'Vidlytics', rpcs: ['admin_vidlytics_metrics'], render: () => <VidlyticsMetricas /> },
    ],
  },
  {
    id: 'ativacao', label: 'Ativa\u00e7\u00e3o',
    subs: [{ id: 'funil', label: 'Ativa\u00e7\u00e3o', rpcs: ['admin_ativacao_metrics'], render: () => <AtivacaoMetricas /> }],
  },
  {
    id: 'ia', label: 'IA e Noah',
    subs: [
      { id: 'custo', label: 'Custo de IA', rpcs: ['admin_usage_summary', 'admin_saas_health'], render: () => <IaCustoMetricas /> },
      { id: 'suporte', label: 'Qualidade do suporte', rpcs: ['admin_noah_feedback_metrics'], render: () => <SuporteMetricas /> },
      { id: 'temas', label: 'Temas das perguntas', rpcs: ['admin_noah_themes'], render: () => <NoahTemasMetricas /> },
    ],
  },
  {
    id: 'voz', label: 'Voz do lojista',
    subs: [
      { id: 'nps', label: 'Satisfa\u00e7\u00e3o (NPS)', rpcs: ['admin_nps_results'], render: () => <NpsMetricas /> },
      { id: 'pedidos', label: 'Pedidos dos lojistas', rpcs: ['pedidos'], render: () => <PedidosMetricas /> },
    ],
  },
  {
    id: 'saude', label: 'Sa\u00fade e mercado',
    subs: [
      { id: 'tecnica', label: 'Sa\u00fade t\u00e9cnica', rpcs: ['admin_saude_metrics'], render: () => <SaudeMetricas /> },
      { id: 'benchmarks', label: 'Benchmarks', rpcs: [], global: true, render: () => <MetricasEtapa4 /> },
    ],
  },
];

function MetricasPageInner() {
  const [abaId, setAbaId] = useState('visao');
  const [subSel, setSubSel] = useState<Record<string, string>>({});
  const aba = ABAS.find((a) => a.id === abaId) ?? ABAS[0];
  const sub = aba.subs.find((s) => s.id === subSel[aba.id]) ?? aba.subs[0];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800">
        {ABAS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAbaId(t.id)}
            className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-[15px] font-semibold transition-colors ${
              aba.id === t.id ? 'border-[#0094eb] text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {aba.subs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {aba.subs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubSel((prev) => ({ ...prev, [aba.id]: s.id }))}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                sub.id === s.id ? 'border-[#0094eb] bg-[#0094eb] text-white' : 'border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {!sub.global && (
        <div className="space-y-3">
          <PeriodoBar />
          <LojaBar rpcs={sub.rpcs} />
        </div>
      )}
      <div key={aba.id + sub.id}>{sub.render()}</div>
    </div>
  );
}

export default function MetricasPage() {
  return (
    <PeriodoProvider>
      <LojaProvider>
        <MetricasPageInner />
      </LojaProvider>
    </PeriodoProvider>
  );
}