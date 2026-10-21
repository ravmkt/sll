import { createContext, useContext, useMemo, useState } from 'react';
import { ymd } from '@/services/admin/marketingPeriod';

export type Period = { start: string; end: string; days: number; custom: boolean };
export type PeriodState = {
  period: Period;
  preset: string;
  setPreset: (v: string) => void;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
};

function build(preset: string, from: string, to: string): Period {
  const today = new Date();
  if (preset === 'custom' && from && to && from <= to) {
    const s = new Date(`${from}T00:00:00`);
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.max(1, Math.round((t0.getTime() - s.getTime()) / 86400000) + 1);
    return { start: from, end: to, days, custom: true };
  }
  const n = Number(preset) || 30;
  const s = new Date();
  s.setDate(s.getDate() - (n - 1));
  return { start: ymd(s), end: ymd(today), days: n, custom: false };
}

export const PeriodContext = createContext<Period>(build('30', '', ''));
export const useMarketingPeriod = () => useContext(PeriodContext);

export function usePeriodState(): PeriodState {
  const [preset, setPresetRaw] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const period = useMemo(() => build(preset, from, to), [preset, from, to]);
  const setPreset = (v: string) => {
    if (v === 'custom' && !from) {
      const s = new Date();
      s.setDate(s.getDate() - 29);
      setFrom(ymd(s));
      setTo(ymd(new Date()));
    }
    setPresetRaw(v);
  };
  return { period, preset, setPreset, from, to, setFrom, setTo };
}

const CLS = 'h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none';

export function PeriodPicker({ ps }: { ps: PeriodState }) {
  const today = ymd(new Date());
  const invalid = ps.preset === 'custom' && (!ps.from || !ps.to || ps.from > ps.to);
  return (
    <div className="mb-1 flex flex-wrap items-center gap-2">
      <select value={ps.preset} onChange={(e) => ps.setPreset(e.target.value)} className={`${CLS} cursor-pointer`}>
        <option value="7">Últimos 7 dias</option>
        <option value="30">Últimos 30 dias</option>
        <option value="90">Últimos 90 dias</option>
        <option value="custom">Período personalizado</option>
      </select>
      {ps.preset === 'custom' && (
        <>
          <input type="date" value={ps.from} max={ps.to || today} onChange={(e) => ps.setFrom(e.target.value)} className={CLS} style={{ colorScheme: 'dark' }} />
          <span className="text-xs text-slate-500">até</span>
          <input type="date" value={ps.to} min={ps.from || undefined} max={today} onChange={(e) => ps.setTo(e.target.value)} className={CLS} style={{ colorScheme: 'dark' }} />
          {invalid && <span className="text-xs text-rose-400">Datas inválidas: usando 30 dias.</span>}
        </>
      )}
    </div>
  );
}