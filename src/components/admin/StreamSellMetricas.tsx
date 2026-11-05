import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, Eye, MessageSquare, MousePointerClick, Radio, Store, TrendingUp, UserPlus } from 'lucide-react';
import { ErrorBox, ITEM, Metric, PeriodBar, TOOLTIP, brl, card, dayLabel, nf, pct, useAdminRpc } from '@/components/admin/MetricasUi';

type Top = { id: string; title: string; store: string | null; status: string | null; peak: number; views: number; clicks: number };
type Data = {
  subscribers: number; subs_without_live: number; stores_with_live: number;
  lives_total: number; lives_held: number; by_status: Record<string, number>; peak: number;
  views_total: number; views_unique: number; product_clicks: number; promo_clicks: number;
  group_clicks: number; signup_clicks: number; share_clicks: number; chat_messages: number;
  leads: number; orders: number; revenue: number;
  daily: { day: string; views: number; clicks: number }[];
  top: Top[];
};

const STATUS: Record<string, string> = {
  scheduled: 'Agendadas', live: 'Ao vivo', finished: 'Encerradas', ended: 'Encerradas', cancelled: 'Canceladas', canceled: 'Canceladas',
};

export default function StreamSellMetricas() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useAdminRpc<Data>('admin_streamsell_metrics', days);
  const d = loading ? '...' : null;
  const x = data;

  const funnel = x
    ? [
        { l: 'Visualizações únicas', v: x.views_unique },
        { l: 'Cliques em produtos', v: x.product_clicks },
        { l: 'Pedidos pagos', v: x.orders },
      ]
    : [];
  const base = Math.max(1, funnel[0]?.v || 0, funnel[1]?.v || 0);
  const rows = (x?.daily ?? []).map((r) => ({ label: dayLabel(r.day), views: Number(r.views), clicks: Number(r.clicks) }));
  const status = Object.entries(x?.by_status ?? {});

  return (
    <div className="space-y-6">
      <PeriodBar days={days} setDays={setDays}>Adoção, audiência e vendas das lives no período.</PeriodBar>
      <ErrorBox text={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Lojas assinantes" value={d ?? nf(x?.subscribers ?? 0)} hint={`${nf(x?.subs_without_live ?? 0)} nunca fizeram live`} icon={Store} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Lojas com live" value={d ?? nf(x?.stores_with_live ?? 0)} hint="No período" icon={Radio} tone="bg-rose-500/15 text-rose-300" />
        <Metric label="Lives" value={d ?? nf(x?.lives_total ?? 0)} hint={`${nf(x?.lives_held ?? 0)} realizadas`} icon={Radio} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Pico de espectadores" value={d ?? nf(x?.peak ?? 0)} hint="Maior audiência simultânea" icon={TrendingUp} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Visualizações" value={d ?? nf(x?.views_unique ?? 0)} hint={`${nf(x?.views_total ?? 0)} eventos de view`} icon={Eye} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Cliques em produtos" value={d ?? nf(x?.product_clicks ?? 0)} hint={`CTR ${pct(x?.product_clicks ?? 0, x?.views_unique ?? 0)}`} icon={MousePointerClick} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Leads captados" value={d ?? nf(x?.leads ?? 0)} hint={`${nf(x?.chat_messages ?? 0)} mensagens no chat`} icon={UserPlus} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Faturamento" value={d ?? brl(x?.revenue ?? 0)} hint={`${nf(x?.orders ?? 0)} pedido(s) pago(s)`} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <p className="mb-3 text-[15px] font-bold text-white">Funil das lives</p>
          <div className="space-y-3">
            {funnel.map((f, i) => (
              <div key={f.l}>
                <div className="mb-1 flex justify-between text-[13px] text-slate-300">
                  <span>{f.l}</span>
                  <b>{nf(f.v)}{i > 0 ? ` (${pct(f.v, funnel[i - 1].v)})` : ''}</b>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-[#0094eb]" style={{ width: `${Math.max(2, Math.min(100, (f.v / base) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-[13px] text-slate-400">
            <span>Cliques na divulgação: <b className="text-slate-200">{nf(x?.promo_clicks ?? 0)}</b></span>
            <span>Cliques no grupo: <b className="text-slate-200">{nf(x?.group_clicks ?? 0)}</b></span>
            <span>Cliques em cadastro: <b className="text-slate-200">{nf(x?.signup_clicks ?? 0)}</b></span>
            <span>Compartilhamentos: <b className="text-slate-200">{nf(x?.share_clicks ?? 0)}</b></span>
          </div>
        </div>

        <div className={card}>
          <p className="mb-3 text-[15px] font-bold text-white">Evolução diária</p>
          <div className="h-56">
            {rows.length === 0 ? (
              <p className="pt-20 text-center text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Sem eventos no período.'}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} />
                  <Bar dataKey="views" name="Visualizações" fill="#0094eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" name="Cliques em produtos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white"><MessageSquare className="h-4 w-4 text-sky-300" /> Lives por status</p>
        {status.length === 0 ? (
          <p className="text-[13px] text-slate-500">Nenhuma live no período.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {status.map(([k, n]) => (
              <span key={k} className="rounded-full border border-slate-700 px-3 py-1 text-[13px] text-slate-200">{STATUS[k] ?? k}: <b>{nf(n)}</b></span>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">Top 10 lives por visualizações</p>
        {(x?.top ?? []).length === 0 ? (
          <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhuma live no período.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Live</th><th className="px-3 py-2">Loja</th><th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Pico</th><th className="px-3 py-2 text-right">Views</th><th className="px-3 py-2 text-right">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {x!.top.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-100">{t.title}</td>
                    <td className="px-3 py-2 text-slate-300">{t.store ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-400">{STATUS[t.status ?? ''] ?? t.status ?? '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-200">{nf(t.peak)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-200">{nf(t.views)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-200">{nf(t.clicks)}</td>
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