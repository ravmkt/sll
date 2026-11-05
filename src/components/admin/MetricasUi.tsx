import { useEffect, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { periodArgs, useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';

const sb: any = supabase;

export const card = 'rounded-2xl border border-violet-500/50 bg-[#111524] p-4';
export const TOOLTIP = { background: '#0b0e1a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0', fontSize: 12 };
export const ITEM = { color: '#e2e8f0', fontSize: 12 };

export const nf = (n: number) => new Intl.NumberFormat('pt-BR').format(Number(n) || 0);
export const brl = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) + '%' : '-');
export const dayLabel = (iso: string) => {
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : String(iso);
};
export const fmtBytes = (b: number) => {
  const n = Number(b) || 0;
  if (n >= 1073741824) return (n / 1073741824).toFixed(2).replace('.', ',') + ' GB';
  if (n >= 1048576) return (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
  return n + ' B';
};

export function useAdminRpc<T>(fn: string, _days?: number) {
  const per = useMetricasPeriodo();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    sb.rpc(fn, periodArgs(per)).then(({ data: d, error: e }: any) => {
      if (!alive) return;
      if (e) setError(e.message || 'Erro ao carregar');
      else setData(d as T);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [fn, per.mode, per.days, per.start, per.end]);

  return { data, loading, error };
}

export function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: ElementType; tone: string }) {
  return (
    <div className={`${card} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
    </div>
  );
}


export function PeriodBar({ children }: { days?: number; setDays?: (n: number) => void; children?: ReactNode }) {
  return <div className="text-[13px] text-slate-400">{children}</div>;
}

export function ErrorBox({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-[13px] text-rose-300">{text}</div>;
}