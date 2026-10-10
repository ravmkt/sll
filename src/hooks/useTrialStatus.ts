import { useMemo } from 'react';
import { useLoja } from '@/contexts/LojaContext';

export type TrialState = 'loading' | 'none' | 'trial' | 'expired' | 'paid';

export function useTrialStatus(): { state: TrialState; daysLeft: number; endsAt: string | null } {
  const { store, loading } = useLoja();

  return useMemo(() => {
    const endsAt: string | null = store?.trial_ends_at ?? null;
    if (loading || !store) return { state: 'loading' as TrialState, daysLeft: 0, endsAt };

    const status = String(store.subscription_status || '').toLowerCase();
    if (['active', 'lifetime', 'paid'].includes(status)) {
      return { state: 'paid' as TrialState, daysLeft: 0, endsAt };
    }
    if (status !== 'trialing' || !endsAt) {
      return { state: 'none' as TrialState, daysLeft: 0, endsAt };
    }

    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return { state: 'expired' as TrialState, daysLeft: 0, endsAt };
    return { state: 'trial' as TrialState, daysLeft: Math.ceil(ms / 86400000), endsAt };
  }, [store, loading]);
}
