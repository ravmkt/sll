import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, DollarSign, Eye, HardDrive, Heart, MessageSquare, MousePointerClick, Play, Store, Video } from 'lucide-react';
import { ErrorBox, ITEM, Metric, PeriodBar, TOOLTIP, brl, card, dayLabel, fmtBytes, nf, pct, useAdminRpc } from '@/components/admin/MetricasUi';

type Top = { id: string; title: string | null; store: string | null; views: number; clicks: number };
type Data = {
  subscribers: number; subs_without_video: number; stores_with_video: number;
  videos_total: number; videos_active: number; storage_bytes: number; stories: number;
  views: number; plays: number; clicks: number; likes: number; comments: number;
  orders: number; revenue: number;
  events_by_type: Record<string, number>;
  daily: { day: string; views: number; clicks: number }[];
  top: Top[];
};

export default function VidlyticsMetricas() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useAdminRpc<Data>('admin_vidlytics_metrics', days);
  const d = loading ? '...' : null;
  const x = data;
  const rows = (x?.daily ?? []).map((r) => ({ label: dayLabel(r.day), views: Number(r.views), clicks: Number(r.clicks) }));
  const types = Object.entries(x?.events_by_type ?? {}).sort((a, b) => b[1] - a[1]);
  const noEvents = !loading && types.length === 0;

  return (
    <div className="space-y-6">
      <PeriodBar days={days} setDays={setDays}>V\u00eddeos, audi\u00eancia e convers\u00e3o do Vidlytics no per\u00edodo.</PeriodBar>
      <ErrorBox text={error} />

      {noEvents && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[13px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>Nenhum evento de v\u00eddeo registrado no per\u00edodo. Visualiza\u00e7\u00f5es, plays, cliques e CTR aparecem aqui assim que o widget enviar eventos.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Lojas assinantes" value={d ?? nf(x?.subscribers ?? 0)} hint={`${nf(x?.subs_without_video ?? 0)} sem v\u00eddeo ativo`} icon={Store} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="V\u00eddeos" value={d ?? nf(x?.videos_active ?? 0)} hint={`${nf(x?.videos_total ?? 0)} no total \u00b7 ${nf(x?.stories ?? 0)} stories`} icon={Video} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Armazenamento" value={d ?? fmtBytes(x?.storage_bytes ?? 0)} hint={`${nf(x?.stores_with_video ?? 0)} loja(s) com v\u00eddeo`} icon={HardDrive} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Faturamento atribu\u00eddo" value={d ?? brl(x?.revenue ?? 0)} hint={`${nf(x?.orders ?? 0)} pedido(s) pago(s)`} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Visualiza\u00e7\u00f5es" value={d ?? nf(x?.views ?? 0)} icon={Eye} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Plays" value={d ?? nf(x?.plays ?? 0)} hint={`Taxa de play ${pct(x?.plays ?? 0, x?.views ?? 0)}`} icon={Play} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Cliques" value={d ?? nf(x?.clicks ?? 0)} hint={`CTR ${pct(x?.clicks ?? 0, x?.views ?? 0)}`} icon={MousePointerClick} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Curtidas e coment\u00e1rios" value={d ?? nf((x?.likes ?? 0) + (x?.comments ?? 0))} hint={`${nf(x?.likes ?? 0)} curtidas \u00b7 ${nf(x?.comments ?? 0)} coment\u00e1rios`} icon={Heart} tone="bg-rose-500/15 text-rose-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <p className="mb-3 text-[15px] font-bold text-white">Evolu\u00e7\u00e3o di\u00e1ria</p>
          <div className="h-56">
            {rows.length === 0 ? (
              <p className="pt-20 text-center text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Sem eventos no per\u00edodo.'}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} />
                  <Bar dataKey="views" name="Visualiza\u00e7\u00f5es" fill="#0094eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" name="Cliques" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={card}>
          <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white"><MessageSquare className="h-4 w-4 text-sky-300" /> Eventos por tipo</p>
          {types.length === 0 ? (
            <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhum evento no per\u00edodo.'}</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {types.map(([k, n]) => (
                <li key={k} className="flex items-center justify-between border-b border-slate-800/60 pb-2 text-[13px] last:border-0">
                  <span className="text-slate-300">{k}</span>
                  <b className="tabular-nums text-white">{nf(n)}</b>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-500">Reten\u00e7\u00e3o m\u00e9dia entra quando o widget gravar eventos de progresso.</p>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">Top 10 v\u00eddeos por visualiza\u00e7\u00f5es</p>
        {(x?.top ?? []).length === 0 ? (
          <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhum v\u00eddeo com eventos no per\u00edodo.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">V\u00eddeo</th><th className="px-3 py-2">Loja</th>
                  <th className="px-3 py-2 text-right">Views</th><th className="px-3 py-2 text-right">Cliques</th><th className="px-3 py-2 text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {x!.top.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-100">{t.title ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-300">{t.store ?? '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-200">{nf(t.views)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-200">{nf(t.clicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-200">{pct(t.clicks, t.views)}</td>
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