import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const PRESETS = [1, 7, 30, 90];

/** Hoje (YYYY-MM-DD) no fuso de Sao Paulo. */
export const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/** Soma dias a uma data YYYY-MM-DD. */
export const addDaysYmd = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export type Periodo = {
  mode: 'preset' | 'custom';
  days: number;
  start: string;
  end: string;
  setPreset: (d: number) => void;
  setCustom: (start: string, end: string) => void;
};

const Ctx = createContext<Periodo | null>(null);

const diffDays = (s: string, e: string) =>
  Math.max(1, Math.round((new Date(e + 'T12:00:00').getTime() - new Date(s + 'T12:00:00').getTime()) / 86400000) + 1);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [days, setDays] = useState(30);
  const [cs, setCs] = useState('');
  const [ce, setCe] = useState('');

  const value = useMemo<Periodo>(() => {
    const setPreset = (d: number) => { setMode('preset'); setDays(d); };
    const setCustom = (s: string, e: string) => { setCs(s); setCe(e); setMode('custom'); };
    if (mode === 'custom' && cs && ce) {
      return { mode: 'custom', days: diffDays(cs, ce), start: cs, end: ce, setPreset, setCustom };
    }
    const t = todaySP();
    
    return { mode: 'preset', days, start: addDaysYmd(t, -(days - 1)), end: t, setPreset, setCustom };
  }, [mode, days, cs, ce]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMetricasPeriodo(): Periodo {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMetricasPeriodo fora do PeriodoProvider');
  return v;
}

/** Para RPCs com p_days (e p_start/p_end opcionais). */
export const periodArgs = (p: Periodo) =>
  ({ p_days: p.days, p_start: p.start, p_end: p.end });

/** Para RPCs que usam apenas p_start/p_end. */
export const rangeArgs = (p: Periodo) => ({ p_start: p.start, p_end: p.end });

const fmt = (v: string) => v.split('-').reverse().join('/');

export function PeriodoBar() {
  const p = useMetricasPeriodo();
  const [open, setOpen] = useState(p.mode === 'custom');
  const [s, setS] = useState(p.start);
  const [e, setE] = useState(p.end);
  const today = todaySP();
  const valid = !!s && !!e && s <= e && e <= today;
  const btn = (on: boolean) =>
    `cursor-pointer rounded-md px-3 py-1 text-[13px] font-semibold transition-colors ${on ? 'bg-[#0094eb] text-white' : 'text-slate-400 hover:text-white'}`;
  const inp = 'rounded-md border border-slate-700 bg-[#0b0e1a] px-2 py-1 text-[13px] text-slate-200 outline-none [color-scheme:dark]';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/50 bg-[#111524] px-4 py-3">
      <p className="text-[13px] text-slate-400">
        {'Per\u00edodo: '}<b className="text-slate-200">{fmt(p.start)} a {fmt(p.end)}</b> ({p.days} {p.days === 1 ? 'dia' : 'dias'})
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-slate-700 bg-[#0b0e1a] p-1">
          {PRESETS.map((d) => (
            <button key={d} type="button" onClick={() => { setOpen(false); p.setPreset(d); }} className={btn(p.mode === 'preset' && p.days === d)}>
              {d === 1 ? 'Hoje' : `${d} dias`}
            </button>
          ))}
          <button type="button" onClick={() => { setS(p.start); setE(p.end); setOpen(true); }} className={btn(p.mode === 'custom' || open)}>
            Personalizado
          </button>
        </div>
        {open && (
          <>
            <input type="date" value={s} max={today} onChange={(ev) => setS(ev.target.value)} className={inp} />
            <span className="text-[13px] text-slate-500">at&eacute;</span>
            <input type="date" value={e} max={today} onChange={(ev) => setE(ev.target.value)} className={inp} />
            <button
              type="button"
              disabled={!valid}
              onClick={() => p.setCustom(s, e)}
              className="cursor-pointer rounded-md bg-[#0094eb] px-3 py-1.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aplicar
            </button>
          </>
        )}
      </div>
    </div>
  );
}