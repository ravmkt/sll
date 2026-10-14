import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type AlertRow = { id: string; name: string; what: string; pct?: number; days?: number };
export type Health = {
  mrr_cents: number; addon_mrr_cents: number; active_stores: number; arpu_cents: number;
  churn_30d: number; trial_ended: number; trial_converted: number;
  alerts: { near_limit: AlertRow[]; past_due: AlertRow[]; no_script: AlertRow[] };
  revenue_origin: { d: string; new: number; renewal: number; upfront: number }[];
};

const CARD = 'rounded-2xl border border-slate-800 bg-[#111524] p-4';
const brl = (c: number) => ((c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 13 };

export function useHealth() {
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    sb.rpc('admin_saas_health').then(({ data, error }: any) => {
      if (error) setErr(error.message);
      else setH(data as Health);
    });
  }, []);
  return { h, err };
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

export function HealthAlerts({ h }: { h: Health }) {
  const open = (id: string) => { window.location.href = `/admin-master?tab=lojas&loja=${id}`; };
  const total = h.alerts.near_limit.length + h.alerts.past_due.length + h.alerts.no_script.length;
  return (
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
  );
}

export function HealthOrigin({ h }: { h: Health }) {
  const series = h.revenue_origin.map((r) => ({ ...r, label: `${r.d.slice(8, 10)}/${r.d.slice(5, 7)}` }));
  return (
    <div className={`${CARD} flex flex-col`}>
      <p className="mb-3 text-[15px] font-bold text-white">Receita por origem (últimos 30 dias)</p>
      <div className="relative min-h-[16rem] flex-1">
        <div className="absolute inset-0">
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
      </div>
      <p className="mt-2 text-xs text-slate-600">Add-on contratado no checkout vai junto com a assinatura e não é separado no gráfico. Este gráfico não segue o filtro de período.</p>
    </div>
  );
}