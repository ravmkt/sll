import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, DollarSign, Percent, Store, TrendingDown, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

const PERIODS = [7, 30, 90];
const MODULES = [
  { v: '', l: 'Todos os m\u00f3dulos' },
  { v: 'vidlytics', l: 'Vidlytics' },
  { v: 'live_commerce', l: 'Stream Sell' },
];

const card = 'rounded-2xl border border-violet-500/50 bg-[#111524] p-4';
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };
const ITEM = { color: '#e2e8f0', fontSize: 12 };

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const brl = (cents: number) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Alert = { id: string; name: string; what: string; pct?: number; days?: number };
type Health = {
  mrr_cents: number;
  addon_mrr_cents: number;
  active_stores: number;
  arpu_cents: number;
  churn_30d: number;
  trial_ended: number;
  trial_converted: number;
  alerts: { near_limit: Alert[]; past_due: Alert[]; no_script: Alert[] };
};
type Origin = { d: string; new: number; renewal: number; upfront: number };

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

function AlertList({ title, items, suffix }: { title: string; items: Alert[]; suffix: (a: Alert) => string }) {
  return (
    <div className={card}>
      <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white"><AlertTriangle className="h-4 w-4 text-amber-400" /> {title}</p>
      {items.length === 0 ? (
        <p className="text-[13px] text-slate-500">Nenhuma loja.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id + a.what} className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-2 text-[13px] last:border-0">
              <span className="truncate font-semibold text-slate-200">{a.name}</span>
              <span className="shrink-0 text-slate-400">{suffix(a)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NegocioMetricas() {
  const [days, setDays] = useState(30);
  const [mod, setMod] = useState('');
  const [health, setHealth] = useState<Health | null>(null);
  const [origin, setOrigin] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const args = { p_start: ymd(start), p_end: ymd(end), p_module: mod || null };
    Promise.all([sb.rpc('admin_saas_health', args), sb.rpc('admin_revenue_origin', args)])
      .then(([h, o]: any[]) => {
        if (!alive) return;
        if (h.error) throw new Error(h.error.message);
        if (o.error) throw new Error(o.error.message);
        setHealth(h.data as Health);
        setOrigin(Array.isArray(o.data) ? (o.data as Origin[]) : []);
      })
      .catch((e: any) => { if (alive) setError(e?.message ?? 'Erro ao carregar'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days, mod]);

  const rows = useMemo(() => {
    const monthly = days > 62;
    return origin.map((r) => {
      const [y, m, d] = String(r.d).slice(0, 10).split('-');
      return {
        label: monthly ? `${m}/${y.slice(2)}` : `${d}/${m}`,
        new: Number(r.new) / 100,
        renewal: Number(r.renewal) / 100,
        upfront: Number(r.upfront) / 100,
      };
    });
  }, [origin, days]);

  const dash = loading ? '...' : null;
  const te = health?.trial_ended ?? 0;
  const tc = health?.trial_converted ?? 0;
  const conv = te > 0 ? `${Math.round((tc / te) * 100)}%` : '-';
  const total = origin.reduce((s, r) => s + Number(r.new) + Number(r.renewal) + Number(r.upfront), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={mod}
          onChange={(e) => setMod(e.target.value)}
          className="rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-[13px] font-semibold text-slate-200 outline-none"
        >
          {MODULES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
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

      {error && <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-[13px] text-rose-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="MRR" value={dash ?? brl(health?.mrr_cents ?? 0)} hint={`Add-ons: ${brl(health?.addon_mrr_cents ?? 0)}`} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Lojas ativas" value={dash ?? String(health?.active_stores ?? 0)} icon={Store} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="ARPU" value={dash ?? brl(health?.arpu_cents ?? 0)} hint="Receita mensal por loja" icon={Users} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Cancelamentos" value={dash ?? String(health?.churn_30d ?? 0)} hint="Lojas que cancelaram no per\u00edodo" icon={TrendingDown} tone="bg-rose-500/15 text-rose-300" />
        <Metric label="Convers\u00e3o do trial" value={dash ?? conv} hint={`${tc} de ${te} trials encerrados`} icon={Percent} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Receita paga" value={dash ?? brl(total)} hint="Faturas pagas no per\u00edodo" icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
      </div>

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">Origem da receita</p>
        <div className="h-64">
          {rows.length === 0 ? (
            <p className="pt-24 text-center text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Sem faturas pagas no per\u00edodo.'}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} formatter={(v: any) => brl(Number(v) * 100)} />
                <Bar dataKey="new" name="Novas" stackId="r" fill="#0094eb" />
                <Bar dataKey="renewal" name="Renova\u00e7\u00f5es" stackId="r" fill="#10b981" />
                <Bar dataKey="upfront" name="Planos antecipados" stackId="r" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-4 text-[13px] text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0094eb]" /> Novas</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Renova\u00e7\u00f5es</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Planos antecipados</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AlertList title="Perto do limite" items={health?.alerts.near_limit ?? []} suffix={(a) => `${a.what} ${a.pct ?? 0}%`} />
        <AlertList title="Pagamento em atraso" items={health?.alerts.past_due ?? []} suffix={(a) => `${a.days ?? 0} dia(s)`} />
        <AlertList title="Script n\u00e3o instalado" items={health?.alerts.no_script ?? []} suffix={(a) => `${a.days ?? 0} dia(s) de conta`} />
      </div>
    </div>
  );
}