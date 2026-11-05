import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, DollarSign, Eye, HardDrive, Heart, MousePointerClick, Play, Store, Video } from 'lucide-react';
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
      <PeriodBar days={days} setDays={setDays}>Vídeos, audiência e conversão do Vidlytics no período.</PeriodBar>
      <ErrorBox text={error} />

      {noEvents && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[13px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>Nenhum evento de vídeo registrado no período. Visualizações, plays, cliques e CTR aparecem aqui assim que o widget enviar eventos.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Lojas assinantes" value={d ?? nf(x?.subscribers ?? 0)} hint={`${nf(x?.subs_without_video ?? 0)} sem vídeo ativo`} icon={Store} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Vídeos" value={d ?? nf(x?.videos_active ?? 0)} hint={`${nf(x?.videos_total ?? 0)} no total · ${nf(x?.stories ?? 0)} stories`} icon={Video} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Armazenamento" value={d ?? fmtBytes(x?.storage_bytes ?? 0)} hint={`${nf(x?.stores_with_video ?? 0)} loja(s) com vídeo`} icon={HardDrive} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Faturamento atribuído" value={d ?? brl(x?.revenue ?? 0)} hint={`${nf(x?.orders ?? 0)} pedido(s) pago(s)`} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Visualizações" value={d ?? nf(x?.views ?? 0)} icon={Eye} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Plays" value={d ?? nf(x?.plays ?? 0)} hint={`Taxa de play ${pct(x?.plays ?? 0, x?.views ?? 0)}`} icon={Play} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Cliques" value={d ?? nf(x?.clicks ?? 0)} hint={`Taxa de clique ${pct(x?.clicks ?? 0, x?.views ?? 0)}`} icon={MousePointerClick} tone="bg-emerald-500/15 text-emerald-300" />
        <Metric label="Curtidas e comentários" value={d ?? nf((x?.likes ?? 0) + (x?.comments ?? 0))} hint={`${nf(x?.likes ?? 0)} curtidas · ${nf(x?.comments ?? 0)} comentários`} icon={Heart} tone="bg-rose-500/15 text-rose-300" />
      </div>

      <div className="grid gap-4">
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
                  <Bar dataKey="clicks" name="Cliques" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">Top 10 vídeos por visualizações</p>
        {(x?.top ?? []).length === 0 ? (
          <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhum vídeo com eventos no período.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Vídeo</th><th className="px-3 py-2">Loja</th>
                  <th className="px-3 py-2 text-right">Views</th><th className="px-3 py-2 text-right">Cliques</th><th className="px-3 py-2 text-right">Taxa de clique</th>
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