import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LifeBuoy } from 'lucide-react';
import NoahSupportTab from '@/components/master/NoahSupportTab';
import NoahUsageTab from '@/components/admin/NoahUsageTab';

type Preset = 'today' | '7' | '15' | '30' | '90' | 'month' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: 'Últimos 7 dias' },
  { key: '15', label: 'Últimos 15 dias' },
  { key: '30', label: 'Últimos 30 dias' },
  { key: '90', label: 'Últimos 90 dias' },
  { key: 'month', label: 'Mês' },
  { key: 'custom', label: 'Período personalizado' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromInput = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const CLS = 'h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none';

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
  const today = toInput(new Date());

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 -mx-6 -mt-6 space-y-3 bg-[#0b0e1a] px-6 pt-6">
        <h1 className="flex items-center gap-2 text-xl font-black text-white"><LifeBuoy className="h-5 w-5 text-amber-500" /> Suporte Noah</h1>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <p className="text-[13px] text-slate-500">Configuração, consumo da IA e base de conhecimento do assistente.</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className={`${CLS} cursor-pointer`}>
              {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            {preset === 'month' && (
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Mês anterior" onClick={() => setOff((v) => v - 1)} className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
                <span className="min-w-[130px] text-center text-xs font-bold capitalize text-white">{monthName}</span>
                <button type="button" aria-label="Próximo mês" disabled={off >= 0} onClick={() => setOff((v) => v + 1)} className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
            {preset === 'custom' && (
              <>
                <input type="date" value={cFrom} max={cTo} onChange={(e) => e.target.value && setCFrom(e.target.value)} className={CLS} style={{ colorScheme: 'dark' }} />
                <span className="text-xs text-slate-500">até</span>
                <input type="date" value={cTo} min={cFrom} max={today} onChange={(e) => e.target.value && setCTo(e.target.value)} className={CLS} style={{ colorScheme: 'dark' }} />
              </>
            )}
          </div>
        </div>
      </div>

      <NoahSupportTab range={range} />
      <div className="mt-8"><NoahUsageTab range={range} /></div>
    </div>
  );
}