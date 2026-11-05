import { useEffect, useMemo, useState } from 'react';
import { Bot, Coins, Percent, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ErrorBox, Metric, card, nf } from '@/components/admin/MetricasUi';
import { rangeArgs, useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';

const sb: any = supabase;

type Row = { purpose: string; store_id: string | null; calls: number; tokens: number; cost_usd: number; cost_brl: number };

const LABEL: Record<string, string> = {
  support: 'Suporte Noah',
  insights: 'Insights personalizados',
  feedback: 'Feedback p\u00f3s-live',
  benchmarks: 'Benchmarks de mercado',
};

const brl4 = (n: number) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });

export default function IaCustoMetricas() {
  const per = useMetricasPeriodo();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [mrr, setMrr] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const from = new Date(per.start + 'T00:00:00-03:00');
    const to = new Date(per.end + 'T00:00:00-03:00');
    to.setDate(to.getDate() + 1);
    (async () => {
      const [u, h] = await Promise.all([
        sb.schema('noah').rpc('admin_usage_summary', { p_from: from.toISOString(), p_to: to.toISOString() }),
        sb.rpc('admin_saas_health', { ...rangeArgs(per), p_module: null }),
      ]);
      if (!alive) return;
      if (u.error) {
        setRows([]);
        setError(u.error.message + '. Confira se o esquema noah est\u00e1 em Settings > API > Exposed schemas.');
        setLoading(false);
        return;
      }
      const list: Row[] = ((u.data || []) as any[]).map((r) => ({
        purpose: String(r.purpose),
        store_id: r.store_id ?? null,
        calls: Number(r.calls) || 0,
        tokens: Number(r.tokens) || 0,
        cost_usd: Number(r.cost_usd) || 0,
        cost_brl: Number(r.cost_brl) || 0,
      }));
      setRows(list);
      setMrr(h.error ? null : Number(h.data?.mrr_cents ?? 0) / 100);
      const ids = Array.from(new Set(list.map((r) => r.store_id).filter(Boolean))) as string[];
      if (ids.length) {
        const st = await sb.from('stores').select('id,name').in('id', ids);
        if (!alive) return;
        const map: Record<string, string> = {};
        ((st.data || []) as any[]).forEach((x) => { map[x.id] = x.name; });
        setNames(map);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [per.mode, per.days, per.start, per.end]);

  const total = useMemo(
    () => rows.reduce((a, r) => ({ calls: a.calls + r.calls, tokens: a.tokens + r.tokens, brl: a.brl + r.cost_brl }), { calls: 0, tokens: 0, brl: 0 }),
    [rows],
  );

  const byPurpose = useMemo(() => {
    const m: Record<string, { calls: number; tokens: number; brl: number }> = {};
    rows.forEach((r) => {
      const x = (m[r.purpose] = m[r.purpose] || { calls: 0, tokens: 0, brl: 0 });
      x.calls += r.calls; x.tokens += r.tokens; x.brl += r.cost_brl;
    });
    return Object.entries(m).sort((a, b) => b[1].brl - a[1].brl);
  }, [rows]);

  const byStore = useMemo(() => {
    const m: Record<string, { calls: number; tokens: number; brl: number }> = {};
    rows.forEach((r) => {
      const k = r.store_id || '__platform';
      const x = (m[k] = m[k] || { calls: 0, tokens: 0, brl: 0 });
      x.calls += r.calls; x.tokens += r.tokens; x.brl += r.cost_brl;
    });
    return Object.entries(m).sort((a, b) => b[1].brl - a[1].brl).slice(0, 15);
  }, [rows]);

  const dash = loading ? '...' : null;
  const avg = total.calls > 0 ? total.brl / total.calls : 0;
  const share = mrr && mrr > 0 ? ((total.brl / mrr) * 100).toFixed(1).replace('.', ',') + '%' : '-';

  const th = 'px-3 py-2 text-xs uppercase tracking-wider text-slate-500';
  const td = 'px-3 py-2 text-slate-200';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-white">Custo de IA</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{'Custo real em R$ por finalidade e por loja, vindo do log de uso (noah.usage_log).'}</p>
      </div>

      <ErrorBox text={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Custo no per\u00edodo" value={dash ?? brl4(total.brl)} hint={'Todas as finalidades'} icon={Coins} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Chamadas" value={dash ?? nf(total.calls)} hint={nf(total.tokens) + ' tokens'} icon={Bot} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Custo por chamada" value={dash ?? brl4(avg)} hint="M\u00e9dia do per\u00edodo" icon={Zap} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Custo sobre o MRR" value={dash ?? share} hint={mrr == null ? 'MRR indispon\u00edvel' : 'Custo de IA \u00f7 MRR'} icon={Percent} tone="bg-emerald-500/15 text-emerald-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <p className="mb-3 text-[15px] font-bold text-white">Por finalidade</p>
          {byPurpose.length === 0 ? (
            <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhum uso registrado no per\u00edodo.'}</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead><tr className="border-b border-slate-800"><th className={th}>Finalidade</th><th className={th + ' text-right'}>Chamadas</th><th className={th + ' text-right'}>Custo</th></tr></thead>
              <tbody>
                {byPurpose.map(([k, x]) => (
                  <tr key={k} className="border-b border-slate-800/60 last:border-0">
                    <td className={td}>{LABEL[k] || k}</td>
                    <td className={td + ' text-right tabular-nums'}>{nf(x.calls)}</td>
                    <td className={td + ' text-right font-semibold tabular-nums'}>{brl4(x.brl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={card}>
          <p className="mb-3 text-[15px] font-bold text-white">Por loja (top 15)</p>
          {byStore.length === 0 ? (
            <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhum uso registrado no per\u00edodo.'}</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead><tr className="border-b border-slate-800"><th className={th}>Loja</th><th className={th + ' text-right'}>Chamadas</th><th className={th + ' text-right'}>Custo</th></tr></thead>
              <tbody>
                {byStore.map(([id, x]) => (
                  <tr key={id} className="border-b border-slate-800/60 last:border-0">
                    <td className={td}>{id === '__platform' ? 'Plataforma (sem loja)' : (names[id] || id.slice(0, 8))}</td>
                    <td className={td + ' text-right tabular-nums'}>{nf(x.calls)}</td>
                    <td className={td + ' text-right font-semibold tabular-nums'}>{brl4(x.brl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}