import { useEffect, useState } from 'react';
import { AlertTriangle, DollarSign, Eye, Gauge, Percent, Radio, Store, ThumbsUp, TrendingDown, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ErrorBox, Metric, brl, card, nf } from '@/components/admin/MetricasUi';
import { periodArgs, rangeArgs, useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';

const sb: any = supabase;
type Alert = { id: string; name: string; what: string; pct?: number; days?: number };

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

export default function VisaoGeralMetricas() {
  const per = useMetricasPeriodo();
  const [r, setR] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const names = ['Neg\u00f3cio', 'Stream Sell', 'Vidlytics', 'NPS', 'Suporte Noah'];
    const keys = ['health', 'ss', 'vid', 'nps', 'noah'];
    Promise.allSettled([
      sb.rpc('admin_saas_health', { ...rangeArgs(per), p_module: null }),
      sb.rpc('admin_streamsell_metrics', periodArgs(per)),
      sb.rpc('admin_vidlytics_metrics', periodArgs(per)),
      sb.rpc('admin_nps_results', { ...periodArgs(per), p_survey_id: null }),
      sb.rpc('admin_noah_feedback_metrics', periodArgs(per)),
    ]).then((res) => {
      if (!alive) return;
      const next: Record<string, any> = {};
      const fails: string[] = [];
      res.forEach((x, i) => {
        const v: any = x.status === 'fulfilled' ? x.value : null;
        if (v && !v.error) next[keys[i]] = v.data;
        else fails.push(`${names[i]}: ${v?.error?.message ?? 'falha ao carregar'}`);
      });
      setR(next);
      setError(fails.length ? fails.join(' | ') : null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [per.mode, per.days, per.start, per.end]);

  const dash = loading ? '...' : null;
  const h = r.health ?? {};
  const ss = r.ss ?? {};
  const vid = r.vid ?? {};
  const nps = r.nps ?? {};
  const noah = r.noah ?? {};
  const te = Number(h.trial_ended ?? 0);
  const tc = Number(h.trial_converted ?? 0);
  const noahTotal = Number(noah.total ?? 0);
  const alerts = h.alerts ?? { near_limit: [], past_due: [], no_script: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-white">{'Vis\u00e3o geral'}</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{'Os principais n\u00fameros do neg\u00f3cio, dos m\u00f3dulos e do suporte no per\u00edodo escolhido.'}</p>
      </div>

      <ErrorBox text={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="MRR" value={dash ?? brl(Number(h.mrr_cents ?? 0) / 100)} hint={`Add-ons: ${brl(Number(h.addon_mrr_cents ?? 0) / 100)}`} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Lojas ativas" value={dash ?? nf(h.active_stores ?? 0)} icon={Store} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Cancelamentos" value={dash ?? nf(h.churn_30d ?? 0)} hint={'No per\u00edodo'} icon={TrendingDown} tone="bg-rose-500/15 text-rose-300" />
        <Metric label={'Convers\u00e3o do trial'} value={dash ?? (te > 0 ? `${Math.round((tc / te) * 100)}%` : '-')} hint={`${tc} de ${te} trials encerrados`} icon={Percent} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Lives realizadas" value={dash ?? nf(ss.lives_held ?? 0)} hint={`${nf(ss.views_total ?? 0)} visualiza\u00e7\u00f5es`} icon={Radio} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Vendas das lives" value={dash ?? brl(Number(ss.revenue ?? 0))} hint={`${nf(ss.orders ?? 0)} pedido(s)`} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label={'Views Vidlytics'} value={dash ?? nf(vid.views ?? 0)} hint={`${nf(vid.clicks ?? 0)} cliques`} icon={Eye} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Receita Vidlytics" value={dash ?? brl(Number(vid.revenue ?? 0))} hint={`${nf(vid.orders ?? 0)} pedido(s)`} icon={Video} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="NPS" value={dash ?? (nps.nps == null ? '-' : String(nps.nps))} hint={`${nf(nps.total ?? 0)} resposta(s)`} icon={Gauge} tone="bg-sky-500/15 text-sky-300" />
        <Metric label={'Aprova\u00e7\u00e3o do Noah'} value={dash ?? (noahTotal > 0 ? `${Math.round((Number(noah.up ?? 0) / noahTotal) * 100)}%` : '-')} hint={`${nf(noahTotal)} voto(s)`} icon={ThumbsUp} tone="bg-violet-500/15 text-violet-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AlertList title="Perto do limite" items={alerts.near_limit ?? []} suffix={(a) => `${a.what} ${a.pct ?? 0}%`} />
        <AlertList title={'Pagamento em atraso'} items={alerts.past_due ?? []} suffix={(a) => `${a.days ?? 0} dia(s)`} />
        <AlertList title={'Script n\u00e3o instalado'} items={alerts.no_script ?? []} suffix={(a) => `${a.days ?? 0} dia(s) de conta`} />
      </div>
    </div>
  );
}