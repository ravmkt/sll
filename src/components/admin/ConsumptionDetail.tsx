import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { getConsumption, type Consumption } from '@/services/admin/consumptionService';

const CARD = 'rounded-2xl border border-slate-800 bg-[#111524] p-4';
const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };
const ITEM = { color: '#e2e8f0', fontSize: 12 };

const EVENT_LABEL: Record<string, string> = {
  video_view: 'Vídeos assistidos', story_open: 'Stories abertos', story_complete: 'Stories concluídos',
  video_close: 'Vídeos fechados', next_video: 'Próximo vídeo', product_view: 'Produtos vistos',
  product_click: 'Cliques em produto', whatsapp_click: 'Cliques no WhatsApp', share: 'Compartilhamentos',
  comment: 'Comentários', like: 'Curtidas', unlike: 'Curtidas removidas',
};

const int = (n: number) => (Number(n) || 0).toLocaleString('pt-BR');
const bytes = (b: number) => {
  const mb = (Number(b) || 0) / 1048576;
  return mb < 1024 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={CARD}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function ConsumptionDetail({ start, end, module }: { start: string; end: string; module: string | null }) {
  const [d, setD] = useState<Consumption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!start || !end || start > end) return;
    let alive = true;
    setLoading(true);
    setError('');
    getConsumption(start, end, module)
      .then((r) => { if (alive) setD(r); })
      .catch((e: any) => { if (alive) setError(e?.message || 'Erro ao carregar o consumo.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [start, end, module]);

  if (error) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>;
  if (!d) return loading ? <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" /> : null;

  const chart = Object.entries(d.events || {})
    .filter(([k]) => k !== 'progress')
    .map(([k, v]) => ({ name: EVENT_LABEL[k] || k, v: Number(v) }))
    .sort((a, b) => b.v - a.v);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Vídeos hospedados" value={int(d.videos_total)} hint={`${int(d.videos_new)} novo(s) no período`} />
        <Kpi label="Espaço dos vídeos" value={bytes(d.videos_bytes)} hint="Arquivos + miniaturas" />
        <Kpi label="Armazenamento das lojas" value={bytes(d.storage_total)} hint="Soma do uso registrado" />
        <Kpi label="Eventos no período" value={int(Object.values(d.events || {}).reduce((a, b) => a + Number(b), 0))} hint="Inclui progresso de reprodução" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className={`${CARD} xl:col-span-2`}>
          <p className="mb-3 text-sm font-bold text-white">Eventos por tipo</p>
          {chart.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">Nenhum evento no período.</p>
          ) : (
            <div style={{ height: Math.max(180, chart.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => int(Number(v))} />
                  <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} formatter={(v: any) => [int(Number(v)), 'Total']} />
                  <Bar dataKey="v" fill="#fd8539" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={CARD}>
          <p className="mb-3 text-sm font-bold text-white">Maiores em armazenamento</p>
          {d.top_storage.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma loja com uso registrado.</p>
          ) : (
            <ul className="space-y-3">
              {d.top_storage.map((t, i) => {
                const pct = t.limit ? Math.min(100, (t.used / t.limit) * 100) : null;
                return (
                  <li key={t.id}>
                    <div className="flex justify-between text-xs">
                      <span className="truncate font-semibold text-slate-200">{i + 1}. {t.name || 'Sem nome'}</span>
                      <span className="ml-2 shrink-0 text-slate-400">{bytes(t.used)}{t.limit ? ` / ${bytes(t.limit)}` : ''}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${pct !== null && pct >= 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-[#0094eb] to-[#fd8539]'}`}
                        style={{ width: `${Math.max(4, pct ?? 30)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}