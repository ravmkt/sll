import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type BmAlert = { key: string; level: 'critical' | 'warning'; title: string; detail: string };

export const BENCHMARKS_UPDATED_EVENT = 'sll:benchmarks-updated';

export function useBenchmarkAlerts(): BmAlert[] {
  const [items, setItems] = useState<BmAlert[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await sb.rpc('admin_benchmark_alerts');
      if (!alive) return;
      setItems(!error && Array.isArray(data) ? (data as BmAlert[]) : []);
    };
    void load();
    const t = setInterval(load, 300000);
    window.addEventListener(BENCHMARKS_UPDATED_EVENT, load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener(BENCHMARKS_UPDATED_EVENT, load);
    };
  }, []);

  return items;
}

export function BenchmarkAlertItems({ items }: { items: BmAlert[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const bad = a.level === 'critical';
        return (
          <li
            key={a.key}
            className={'flex items-start gap-3 rounded-xl border p-3 ' + (bad ? 'border-rose-500/40 bg-rose-500/10' : 'border-amber-500/40 bg-amber-500/10')}
          >
            {bad ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
            <div className="min-w-0">
              <p className={'text-[13px] font-bold ' + (bad ? 'text-rose-200' : 'text-amber-200')}>{a.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-slate-300">{a.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}