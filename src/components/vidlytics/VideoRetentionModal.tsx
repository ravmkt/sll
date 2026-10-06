import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';

type Row = { max_second: number; completed: boolean; sessions: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  video: { id: string; title?: string | null; duration?: number | null } | null;
  start: string;
  end: string;
};

const STEP = 5;
const W = 720;
const H = 260;
const PL = 42;
const PR = 14;
const PT = 12;
const PB = 28;

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

export default function VideoRetentionModal({ open, onOpenChange, storeId, video, start, end }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !video || !storeId) return;
    let active = true;
    setLoading(true);
    setError('');
    setHover(null);
    VidlyticsDatabaseService.getVideoRetentionCurve(storeId, video.id, start, end)
      .then((d) => { if (active) setRows(d); })
      .catch((e) => {
        console.error('Erro ao buscar curva de retenção:', e);
        if (active) setError('Não foi possível carregar a retenção deste vídeo.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, video?.id, storeId, start, end]);

  const model = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.sessions, 0);
    if (!total || !video) return null;
    const observedMax = Math.max(...rows.map((r) => r.max_second));
    const duration = Math.max(Number(video.duration) || 0, observedMax, STEP);
    const eff = rows.map((r) => ({ sec: r.completed ? duration : Math.min(r.max_second, duration), n: r.sessions }));

    const secs: number[] = [];
    for (let s = 0; s < duration; s += STEP) secs.push(s);
    secs.push(duration);

    const points = secs.map((sec) => {
      const reached = eff.filter((e) => e.sec >= sec).reduce((a, e) => a + e.n, 0);
      return { sec, reached, pct: (reached / total) * 100 };
    });

    const drops = points.slice(1).map((p, i) => ({
      from: points[i].sec,
      to: p.sec,
      lost: points[i].reached - p.reached,
      lostPct: ((points[i].reached - p.reached) / total) * 100,
    }));
    const maxLost = Math.max(...drops.map((d) => d.lost), 0);
    const topDrops = [...drops].filter((d) => d.lost > 0).sort((a, b) => b.lost - a.lost).slice(0, 3);
    const avgSec = eff.reduce((a, e) => a + e.sec * e.n, 0) / total;
    const completed = rows.filter((r) => r.completed).reduce((a, r) => a + r.sessions, 0);
    const hook = points[1] ? points[1].pct : 100;

    return { total, duration, points, drops, maxLost, topDrops, avgSec, completed, hook };
  }, [rows, video]);

  const x = (sec: number, duration: number) => PL + (sec / duration) * (W - PL - PR);
  const y = (pct: number) => PT + (1 - pct / 100) * (H - PT - PB);

  const line = model ? model.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.sec, model.duration).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ') : '';
  const area = model ? `${line} L${x(model.duration, model.duration).toFixed(1)},${y(0)} L${x(0, model.duration)},${y(0)} Z` : '';

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!model) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const sec = ((svgX - PL) / (W - PL - PR)) * model.duration;
    let best = 0;
    model.points.forEach((p, i) => { if (Math.abs(p.sec - sec) < Math.abs(model.points[best].sec - sec)) best = i; });
    setHover(best);
  };

  const hp = model && hover !== null ? model.points[hover] : null;
  const worst = model?.topDrops[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white text-left space-y-1">
          <DialogTitle className="text-lg font-extrabold text-slate-900">Retenção de público</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">{video?.title || 'Vídeo'} · período selecionado</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5">

        {loading && <p className="py-10 text-center text-sm text-slate-500">Carregando retenção...</p>}
        {!loading && error && <p className="py-10 text-center text-sm text-red-600">{error}</p>}
        {!loading && !error && !model && (
          <p className="py-10 text-center text-sm text-slate-500">
            Sem sessões com dados de reprodução neste período.
          </p>
        )}

        {!loading && !error && model && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { l: 'Sessões', v: String(model.total) },
                { l: 'Duração média assistida', v: fmt(model.avgSec) },
                { l: '% média assistida', v: `${Math.round((model.avgSec / model.duration) * 100)}%` },
                { l: 'Assistiram até o fim', v: `${Math.round((model.completed / model.total) * 100)}%` },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <p className="text-[11px] font-semibold text-slate-500">{k.l}</p>
                  <p className="text-lg font-extrabold text-slate-900">{k.v}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span className="font-medium text-slate-800">Retenção ao longo do vídeo</span>
                <span>{hp ? `${fmt(hp.sec)} · ${hp.pct.toFixed(0)}% (${hp.reached} de ${model.total} sessões)` : 'Passe o mouse no gráfico'}</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                {[0, 25, 50, 75, 100].map((g) => (
                  <g key={g}>
                    <line x1={PL} x2={W - PR} y1={y(g)} y2={y(g)} stroke="#e5e7eb" strokeWidth={1} />
                    <text x={PL - 6} y={y(g) + 4} textAnchor="end" fontSize={11} fill="#6b7280">{g}%</text>
                  </g>
                ))}
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <text key={f} x={x(model.duration * f, model.duration)} y={H - 8} textAnchor="middle" fontSize={11} fill="#6b7280">
                    {fmt(model.duration * f)}
                  </text>
                ))}
                {worst && (
                  <rect
                    x={x(worst.from, model.duration)}
                    y={PT}
                    width={x(worst.to, model.duration) - x(worst.from, model.duration)}
                    height={H - PT - PB}
                    fill="#ef4444"
                    opacity={0.12}
                  />
                )}
                <path d={area} fill="#0ea5e9" opacity={0.15} />
                <path d={line} fill="none" stroke="#0ea5e9" strokeWidth={2.5} strokeLinejoin="round" />
                {hp && (
                  <g>
                    <line x1={x(hp.sec, model.duration)} x2={x(hp.sec, model.duration)} y1={PT} y2={H - PB} stroke="#94a3b8" strokeDasharray="4 3" />
                    <circle cx={x(hp.sec, model.duration)} cy={y(hp.pct)} r={4.5} fill="#0ea5e9" stroke="#fff" strokeWidth={2} />
                  </g>
                )}
              </svg>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">A faixa vermelha marca o trecho com maior abandono.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="mb-1 text-xs font-bold text-slate-800">Espectadores perdidos a cada {STEP}s</p>
              <svg viewBox={`0 0 ${W} 120`} className="w-full">
                {model.drops.map((d) => {
                  const bw = (W - PL - PR) / model.drops.length;
                  const bx = PL + (d.from / model.duration) * (W - PL - PR);
                  const bh = model.maxLost > 0 ? (d.lost / model.maxLost) * 84 : 0;
                  return (
                    <g key={d.from}>
                      <rect x={bx + 1} y={100 - bh} width={Math.max(bw - 2, 1)} height={bh} rx={2}
                        fill={d.lost === model.maxLost && d.lost > 0 ? '#ef4444' : '#94a3b8'} />
                      <title>{`${fmt(d.from)}–${fmt(d.to)}: ${d.lost} sessões (${d.lostPct.toFixed(0)}%)`}</title>
                    </g>
                  );
                })}
                <line x1={PL} x2={W - PR} y1={100} y2={100} stroke="#e5e7eb" />
                {[0, 0.5, 1].map((f) => (
                  <text key={f} x={x(model.duration * f, model.duration)} y={116} textAnchor="middle" fontSize={11} fill="#6b7280">
                    {fmt(model.duration * f)}
                  </text>
                ))}
              </svg>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
              <p className="mb-1 font-medium">Insights</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  {model.hook >= 80
                    ? `Bom gancho: ${model.hook.toFixed(0)}% ainda assistem aos ${STEP}s iniciais.`
                    : `Gancho fraco: só ${model.hook.toFixed(0)}% chegam aos ${STEP}s. Reforce os primeiros segundos.`}
                </li>
                {model.topDrops.map((d, i) => (
                  <li key={d.from}>
                    {i === 0 ? 'Maior abandono' : `${i + 1}º maior abandono`} entre {fmt(d.from)} e {fmt(d.to)}:
                    {' '}{d.lost} de {model.total} sessões ({d.lostPct.toFixed(0)}%).
                  </li>
                ))}
                {model.topDrops.length === 0 && <li>Nenhuma queda relevante: o público assiste até o fim.</li>}
              </ul>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}