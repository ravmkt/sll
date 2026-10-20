import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NoahSupportTab from '@/components/master/NoahSupportTab';
import NoahUsageTab from '@/components/admin/NoahUsageTab';

type Preset = 'today' | '7' | '15' | '30' | '90' | 'month' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '15', label: '15 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'month', label: 'Mês' },
  { key: 'custom', label: 'Personalizado' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromInput = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function NoahPage() {
  const [preset, setPreset] = useState<Preset>('month');
  const [off, setOff] = useState(0);
  const [cFrom, setCFrom] = useState(() => toInput(new Date(Date.now() - 6 * 86400000)));
  const [cTo, setCTo] = useState(() => toInput(new Date()));

  const range = useMemo(() => {
    const n = new Date();
    const d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (preset === 'month') {
      return { from: new Date(n.getFullYear(), n.getMonth() + off, 1), to: new Date(n.getFullYear(), n.getMonth() + off + 1, 1) };
    }
    if (preset === 'custom') {
      const f = fromInput(cFrom);
      const t = fromInput(cTo);
      const a = f <= t ? f : t;
      const b = f <= t ? t : f;
      return { from: a, to: new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1) };
    }
    const days = preset === 'today' ? 1 : Number(preset);
    return {
      from: new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - (days - 1)),
      to: new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1),
    };
  }, [preset, off, cFrom, cTo]);

  const monthName = range.from.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const dateInput = 'rounded-lg border border-slate-700 bg-[#111524] px-2 py-1 text-xs text-white [color-scheme:dark]';

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0a0d1a] px-4 py-3">
        <div>
          <h2 className="text-xl font-black text-white">Suporte Noah</h2>
          <p className="text-xs text-slate-400">Configuração, consumo da IA e base de conhecimento do assistente.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-[#111524] p-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  preset === p.key ? 'bg-[#0094eb] text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'month' && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#111524] px-1 py-1">
              <button type="button" aria-label="Mês anterior" onClick={() => setOff((v) => v - 1)} className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[130px] text-center text-xs font-bold capitalize text-white">{monthName}</span>
              <button type="button" aria-label="Próximo mês" disabled={off >= 0} onClick={() => setOff((v) => v + 1)} className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <input type="date" value={cFrom} max={cTo} onChange={(e) => e.target.value && setCFrom(e.target.value)} className={dateInput} />
              <span>até</span>
              <input type="date" value={cTo} min={cFrom} max={toInput(new Date())} onChange={(e) => e.target.value && setCTo(e.target.value)} className={dateInput} />
            </div>
          )}
        </div>
      </div>

      <NoahSupportTab range={range} />
      <div className="mt-8"><NoahUsageTab range={range} /></div>
    </div>
  );
}