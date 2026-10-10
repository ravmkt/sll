import { useEffect, useState } from 'react';
import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';

export interface ModuleTrial {
  moduleKey: string;
  label: string;
  endsAt: string;
  daysLeft: number;
  expired: boolean;
}

const LABELS: Record<string, string> = {
  vidlytics: 'Vidlytics',
  live_commerce: 'Live Commerce',
  pdv: 'PDV',
};
const PAID = ['active', 'lifetime', 'past_due'];

interface Row {
  status: string;
  module_key: string | null;
  current_period_end: string | null;
  plans: any;
}

function planModules(r: Row): string[] {
  const p = Array.isArray(r.plans) ? r.plans[0] : r.plans;
  return Array.isArray(p?.modules) ? p.modules : [];
}

function compute(rows: Row[]): { hasPaid: boolean; trials: ModuleTrial[] } {
  const now = Date.now();
  const hasPaid = rows.some((r) => PAID.includes(r.status));
  const covered = (m: string) =>
    rows.some(
      (r) =>
        PAID.includes(r.status) &&
        (r.module_key === m || ((!r.module_key || r.module_key === 'bundle') && planModules(r).includes(m)))
    );
  const best = new Map<string, ModuleTrial>();
  for (const r of rows) {
    if (r.status !== 'trialing' || !r.module_key || !r.current_period_end) continue;
    if (r.module_key === 'bundle' || covered(r.module_key)) continue;
    const ms = new Date(r.current_period_end).getTime() - now;
    const t: ModuleTrial = {
      moduleKey: r.module_key,
      label: LABELS[r.module_key] ?? r.module_key,
      endsAt: r.current_period_end,
      daysLeft: ms > 0 ? Math.ceil(ms / 86400000) : 0,
      expired: ms <= 0,
    };
    const prev = best.get(r.module_key);
    if (!prev || new Date(t.endsAt).getTime() > new Date(prev.endsAt).getTime()) best.set(r.module_key, t);
  }
  return { hasPaid, trials: Array.from(best.values()) };
}

export function useModuleTrials(): { loading: boolean; hasPaid: boolean; trials: ModuleTrial[] } {
  const { store, loading: lojaLoading } = useLoja();
  const sid = store?.id;
  const [res, setRes] = useState<{ sid: string; hasPaid: boolean; trials: ModuleTrial[] } | null>(null);

  useEffect(() => {
    if (!sid) return;
    let alive = true;
    const q = (cols: string) =>
      (supabase as any)
        .from('subscriptions')
        .select(cols)
        .eq('store_id', sid)
        .in('status', ['active', 'trialing', 'lifetime', 'past_due']);
    (async () => {
      try {
        let { data, error } = await q('status,module_key,current_period_end,plans(modules)');
        if (error || !data) {
          console.warn('[useModuleTrials] query com plans falhou, tentando sem plans:', error);
          const r2 = await q('status,module_key,current_period_end');
          data = r2.data;
          error = r2.error;
        }
        if (!alive) return;
        console.log('[DBG useModuleTrials]', sid, error, JSON.stringify(data));
        const r = error || !data ? { hasPaid: false, trials: [] as ModuleTrial[] } : compute(data as Row[]);
        setRes({ sid, ...r });
      } catch (e) {
        console.error('[useModuleTrials]', e);
        if (alive) setRes({ sid, hasPaid: false, trials: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, [sid]);

  const ready = !lojaLoading && (!sid || res?.sid === sid);
  return {
    loading: !ready,
    hasPaid: ready && !!sid ? !!res?.hasPaid : false,
    trials: ready && !!sid ? res?.trials ?? [] : [],
  };
}

