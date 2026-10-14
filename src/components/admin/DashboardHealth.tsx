import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, Loader2, Percent, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

type AlertRow = { id: string; name: string; what: string; pct?: number; days?: number };
type Health = {
  mrr_cents: number; addon_mrr_cents: number; active_stores: number; arpu_cents: number;
  churn_30d: number; trial_ended: number; trial_converted: number;
  alerts: { near_limit: AlertRow[]; past_due: AlertRow[]; no_script: AlertRow[] };
  revenue_origin: { d: string; new: number; renewal: number; upfront: number }[];
};

const CARD = 'rounded-2xl border border-slate-800 bg-[#111524] p-4';
const brl = (c: number) => ((c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 13 };

function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: ElementType; tone: string }) {
  return (
    <div className={`${CARD} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
    </div>
  );
}

function AlertBox({ title, rows, detail, onOpen }: { title: string; rows: AlertRow[]; detail: (r: AlertRow) => string; onOpen: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b0e1a] p-3">
      <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-white">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-xs ${rows.length ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{rows.length}</span>
      </p>
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate-500">Nenhuma loja.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={`${r.id}-${r.what}-${i}`}>
              <button type="button" onClick={() => onOpen(r.id)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-white/5">
                <span className="truncate font-semibold text-slate-200">{r.name}</span>
                <span className="shrink-0 text-xs text-amber-300">{detail(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardHealth() {
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    sb.rpc('admin_saas_health').then(({ data, error }: any) => {
      if (error) setErr(error.message);
      else setH(data as Health);
    });
  }, []);

  // Abre a ficha da loja na aba Lojas
  const open = (id: string) => { window.location.href = `/admin-master?tab=lojas&loja=${id}`; };

  if (err) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-300">Saúde do negócio: {err}</div>;
  if (!h) return <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />;

  const total = h.alerts.near_limit.length + h.alerts.past_due.length + h.alerts.no_script.length;
  const conv = h.trial_ended > 0 ? Math.round((h.trial_converted / h.trial_ended) * 100) : null;
  const series = h.revenue_origin.map((r) => ({ ...r, label: `${r.d.slice(8, 10)}/${r.d.slice(5, 7)}` }));

  return (
    <div className="space-y-6">
      <section className={`${CARD} space-y-3`}>
        <div className="flex items-center gap-2">
          {total ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          <h2 className="text-sm font-bold text-white">Central de alertas</h2>
          <span className="text-[13px] text-slate-500">{total ? `${total} ponto(s) pedem atenção` : 'Tudo certo por aqui'}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <AlertBox title="Perto do limite (90%+)" rows={h.alerts.near_limit} detail={(r) => `${r.what} ${r.pct}%`} onOpen={open} />
          <AlertBox title="Pagamento em atraso" rows={h.alerts.past_due} detail={(r) => `${r.days ?? 0} dia(s)`} onOpen={open} />
          <AlertBox title="Sem script há 48h+" rows={h.alerts.no_script} detail={(r) => `${r.days ?? 0} dia(s) de conta`} onOpen={open} />
        </div>
        <p className="text-xs text-slate-600">Quem está perto do limite é oportunidade de vender add-on.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Saúde do negócio</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="MRR" value={brl(h.mrr_cents)} hint={`Recorrência mensal (inclui ${brl(h.addon_mrr_cents)} de add-ons)`} icon={TrendingUp} tone="bg-emerald-500/15 text-emerald-400" />
          <Metric label="Ticket médio (ARPU)" value={brl(h.arpu_cents)} hint={`Por loja pagante (${h.active_stores})`} icon={Users} tone="bg-[#0094eb]/15 text-[#0094eb]" />
          <Metric label="Churn (30 dias)" value={String(h.churn_30d)} hint="Lojas que cancelaram" icon={TrendingDown} tone="bg-rose-500/15 text-rose-400" />
          <Metric label="Conversão de trial" value={conv === null ? '—' : `${conv}%`} hint={`${h.trial_converted} de ${h.trial_ended} trials (90 dias)`} icon={Percent} tone="bg-[#fd8539]/15 text-[#fd8539]" />
        </div>
      </section>

      <section className={CARD}>
        <p className="mb-3 text-sm font-bold text-white">Receita por origem (30 dias)</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={70} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `R$ ${Math.round(Number(v) / 100)}`} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [brl(Number(v)), n]} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="new" name="Assinatura nova" stackId="a" fill="#0094eb" />
              <Bar dataKey="renewal" name="Renovação" stackId="a" fill="#10b981" />
              <Bar dataKey="upfront" name="Anual/semestral à vista" stackId="a" fill="#fd8539" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slate-600">Add-on contratado no checkout vai junto com a assinatura. Hoje não dá para separá-lo no gráfico.</p>
      </section>
    </div>
  );
}