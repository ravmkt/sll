import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Consumption } from '@/services/admin/consumptionService';

const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };
const ITEM = { color: '#e2e8f0', fontSize: 12 };

const EVENT_LABEL: Record<string, string> = {
  video_view: 'Vídeos assistidos', story_open: 'Stories abertos', story_complete: 'Stories concluídos',
  video_close: 'Vídeos fechados', next_video: 'Próximo vídeo', product_view: 'Produtos vistos',
  product_click: 'Cliques em produto', whatsapp_click: 'Cliques no WhatsApp', share: 'Compartilhamentos',
  comment: 'Comentários', like: 'Curtidas', unlike: 'Curtidas removidas',
};

const int = (n: number) => (Number(n) || 0).toLocaleString('pt-BR');
export const bytesFmt = (b: number) => {
  const mb = (Number(b) || 0) / 1048576;
  return mb < 1024 ? `${mb.toFixed(1).replace('.', ',')} MB` : `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
};

export function EventsChart({ d, card }: { d: Consumption; card: string }) {
  const chart = Object.entries(d.events || {})
    .filter(([k]) => k !== 'progress')
    .map(([k, v]) => ({ name: EVENT_LABEL[k] || k, v: Number(v) }))
    .sort((a, b) => b.v - a.v);
  return (
    <div className={card}>
      <p className="mb-3 text-[15px] font-bold text-white">Eventos por tipo</p>
      {chart.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-500">Nenhum evento no período.</p>
      ) : (
        <div style={{ height: Math.max(180, chart.length * 32) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.15)" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => int(Number(v))} />
              <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={TOOLTIP} itemStyle={ITEM} labelStyle={ITEM} formatter={(v: any) => [int(Number(v)), 'Total']} />
              <Bar dataKey="v" fill="#a855f7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function StorageRanking({ d, card }: { d: Consumption; card: string }) {
  return (
    <div className={card}>
      <p className="mb-3 text-[15px] font-bold text-white">Maiores em armazenamento</p>
      {d.top_storage.length === 0 ? (
        <p className="text-[13px] text-slate-500">Nenhuma loja com uso registrado.</p>
      ) : (
        <ul className="space-y-3">
          {d.top_storage.map((t, i) => {
            const pct = t.limit ? Math.min(100, (t.used / t.limit) * 100) : null;
            return (
              <li key={t.id}>
                <div className="flex justify-between text-[13px]">
                  <span className="truncate font-semibold text-slate-200">{i + 1}. {t.name || 'Sem nome'}</span>
                  <span className="ml-2 shrink-0 text-slate-400">{bytesFmt(t.used)}{t.limit ? ` / ${bytesFmt(t.limit)}` : ''}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${pct !== null && pct >= 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-[#0094eb] to-[#06b6d4]'}`}
                    style={{ width: `${Math.max(4, pct ?? 30)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}