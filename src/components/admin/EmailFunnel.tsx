import { useEffect, useState } from 'react';
import { EMPTY_EMAIL_METRICS, getEmailMetrics, type EmailMetrics } from '@/services/admin/emailCampaigns';

const OPTS = [7, 30, 90];
const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const fmt = (v: number) => v.toFixed(1).replace('.', ',') + '%';
const fmt2 = (v: number) => v.toFixed(2).replace('.', ',') + '%';

export default function EmailFunnel() {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<EmailMetrics>(EMPTY_EMAIL_METRICS);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    getEmailMetrics(days).then(setM).catch((e) => setErr(e?.message || 'Erro ao carregar o funil'));
  }, [days]);

  const base = m.sent;
  const stages = [
    { label: 'Enviados', value: m.sent, color: '#64748b' },
    { label: 'Entregues', value: m.delivered, color: '#38bdf8' },
    { label: 'Abertos', value: m.opened, color: '#fd8539' },
    { label: 'Clicados', value: m.clicked, color: '#10b981' },
  ];
  const spam = pct(m.complained, base);
  const bounce = pct(m.bounced, base);
  const spamBad = spam > 0.2;
  const bounceBad = bounce > 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-slate-100">Funil e saúde de entrega</h3>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200">
          {OPTS.map((d) => <option key={d} value={d}>{'Últimos ' + d + ' dias'}</option>)}
        </select>
      </div>
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {stages.map((st) => {
            const p = pct(st.value, base);
            return (
              <div key={st.label} className="mb-3 last:mb-0">
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-slate-200">{st.label}</span>
                  <span className="tabular-nums text-slate-400">{st.value} · {fmt(st.label === 'Enviados' ? (base > 0 ? 100 : 0) : p)}</span>
                </div>
                <div className="h-5 rounded-md bg-slate-800">
                  <div className="h-5 rounded-md transition-all" style={{ width: Math.max(base > 0 ? p : 0, st.value > 0 ? 1.5 : 0) + '%', background: st.color }} />
                </div>
              </div>
            );
          })}
          <p className="mt-3 text-[12px] text-slate-500">Percentuais sobre o total de enviados do período.</p>
        </div>
        <div className="grid gap-3">
          <div className={'rounded-2xl border p-4 ' + (spamBad ? 'border-rose-500/50 bg-rose-500/5' : 'border-slate-800 bg-slate-900')}>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">Reclamações de spam</p>
            <p className={'mt-1 text-3xl font-bold tabular-nums ' + (spamBad ? 'text-rose-400' : 'text-[#fd8539]')}>{fmt2(spam)}</p>
            <p className="mt-1 text-[12px] text-slate-500">{m.complained} reclamação(ões). Acima de 0,2% o domínio corre risco.</p>
          </div>
          <div className={'rounded-2xl border p-4 ' + (bounceBad ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 bg-slate-900')}>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">Rejeitados (bounce)</p>
            <p className={'mt-1 text-3xl font-bold tabular-nums ' + (bounceBad ? 'text-amber-400' : 'text-[#fd8539]')}>{fmt2(bounce)}</p>
            <p className="mt-1 text-[12px] text-slate-500">{m.bounced} rejeitado(s) + {m.failed} falha(s) de envio. Acima de 2%, limpe a lista.</p>
          </div>
        </div>
      </div>
    </div>
  );
}