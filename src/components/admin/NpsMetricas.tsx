import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Gauge, MessageSquare, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { periodArgs, useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';

const sb: any = supabase;

const card = 'rounded-2xl border border-violet-500/50 bg-[#111524] p-4';
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };
const ITEM = { color: '#e2e8f0', fontSize: 12 };

type Count = { key: string; count: number };
type Results = {
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number | null;
  distribution: { score: number; count: number }[];
  pains: Count[];
  features: Count[];
  comments: { store: string | null; score: number | null; comment: string | null; pain_other: string | null; created_at: string }[];
};
type Survey = { id: string; name: string; responses_count: number };

const pretty = (k: string) => {
  const s = String(k || '').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const barColor = (s: number) => (s >= 9 ? '#10b981' : s >= 7 ? '#f59e0b' : '#f43f5e');

function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: ElementType; tone: string }) {
  return (
    <div className={`${card} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
    </div>
  );
}

function Ranking({ title, items }: { title: string; items: Count[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className={card}>
      <p className="mb-3 text-[15px] font-bold text-white">{title}</p>
      {items.length === 0 ? (
        <p className="text-[13px] text-slate-500">Sem respostas no período.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.key} className="text-[13px]">
              <div className="mb-1 flex justify-between text-slate-300"><span>{pretty(i.key)}</span><b>{i.count}</b></div>
              <div className="h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-[#0094eb]" style={{ width: `${(i.count / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NpsMetricas() {
  const per = useMetricasPeriodo();
  const [survey, setSurvey] = useState('');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [data, setData] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sb.rpc('admin_nps_list_surveys').then(({ data: d }: any) => {
      if (Array.isArray(d)) setSurveys(d.map((s: any) => ({ id: s.id, name: s.name, responses_count: s.responses_count })));
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    sb.rpc('admin_nps_results', { ...periodArgs(per), p_survey_id: survey || null })
      .then(({ data: d, error: e }: any) => {
        if (!alive) return;
        if (e) throw new Error(e.message);
        setData(d as Results);
      })
      .catch((e: any) => { if (alive) setError(e?.message ?? 'Erro ao carregar'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [per.mode, per.days, per.start, per.end, survey]);

  const dash = loading ? '...' : null;
  const total = data?.total ?? 0;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '-');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={survey}
          onChange={(e) => setSurvey(e.target.value)}
          className="rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-[13px] font-semibold text-slate-200 outline-none"
        >
          <option value="">Todas as pesquisas</option>
          {surveys.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.responses_count})</option>)}
        </select>
      </div>

      {error && <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-[13px] text-rose-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="NPS" value={dash ?? (data?.nps == null ? '-' : String(data.nps))} hint={`${total} resposta(s)`} icon={Gauge} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Promotores" value={dash ?? pct(data?.promoters ?? 0)} hint="Notas 9 e 10" icon={ThumbsUp} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Neutros" value={dash ?? pct(data?.passives ?? 0)} hint="Notas 7 e 8" icon={Users} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Detratores" value={dash ?? pct(data?.detractors ?? 0)} hint="Notas 0 a 6" icon={ThumbsDown} tone="bg-rose-500/15 text-rose-300" />
      </div>

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">Distribuição das notas</p>
        <div className="h-56">
          {total === 0 ? (
            <p className="pt-20 text-center text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhuma resposta no período.'}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.distribution ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="score" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} labelFormatter={(v: any) => `Nota ${v}`} />
                <Bar dataKey="count" name="Respostas" radius={[4, 4, 0, 0]}>
                  {(data?.distribution ?? []).map((d) => <Cell key={d.score} fill={barColor(d.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranking title="Maiores dificuldades" items={data?.pains ?? []} />
        <Ranking title="Recursos que mais geram resultado" items={data?.features ?? []} />
      </div>

      <div className={card}>
        <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white"><MessageSquare className="h-4 w-4 text-sky-300" /> Comentários recentes</p>
        {(data?.comments ?? []).length === 0 ? (
          <p className="text-[13px] text-slate-500">Nenhum comentário no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Loja</th>
                  <th className="px-3 py-2">Nota</th>
                  <th className="px-3 py-2">Comentário</th>
                </tr>
              </thead>
              <tbody>
                {(data?.comments ?? []).map((c, i) => (
                  <tr key={i} className="border-b border-slate-800/60 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 font-semibold text-slate-200">{c.store ?? '-'}</td>
                    <td className="px-3 py-2 font-bold text-white">{c.score ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-100">{[c.comment, c.pain_other].filter(Boolean).join(' | ') || '-'}</td>
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