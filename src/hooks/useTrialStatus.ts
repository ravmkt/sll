import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';

export type TrialState = 'loading' | 'none' | 'trial' | 'expired' | 'paid';

export function useTrialStatus(): { state: TrialState; daysLeft: number; endsAt: string | null } {
  const { store } = useLoja();
  const storeId: string | null = store?.id ?? null;
  const [paid, setPaid] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    if (!storeId) {
      setPaid(null);
      return;
    }
    (supabase as any)
      .from('subscriptions')
      .select('id')
      .eq('store_id', storeId)
      .eq('is_current', true)
      .in('status', ['active', 'lifetime', 'past_due'])
      .limit(1)
      .then(
        ({ data, error }: { data: unknown[] | null; error: unknown }) => {
          if (alive) setPaid(!error && !!data && data.length > 0);
        },
        () => {
          if (alive) setPaid(false);
        }
      );
    return () => {
      alive = false;
    };
  }, [storeId]);

  return useMemo(() => {
    const endsAt: string | null = store?.trial_ends_at ?? null;
    if (!store || paid === null) return { state: 'loading' as TrialState, daysLeft: 0, endsAt };
    const status = String(store.subscription_status || '').toLowerCase();
    if (paid || ['active', 'lifetime', 'paid'].includes(status)) {
      return { state: 'paid' as TrialState, daysLeft: 0, endsAt };
    }
    if (!endsAt) return { state: 'none' as TrialState, daysLeft: 0, endsAt };
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return { state: 'expired' as TrialState, daysLeft: 0, endsAt };
    return { state: 'trial' as TrialState, daysLeft: Math.ceil(ms / 86400000), endsAt };
  }, [store, paid]);
}
