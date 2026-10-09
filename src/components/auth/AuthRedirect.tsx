import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';

export const CHECKOUT_INTENT_KEY = 'sll_checkout_intent';
const USED_KEY = 'sll_intent_used';
const MAX_AGE_MS = 24 * 3600 * 1000;

export type Intent = { plan: string; cycle?: string; module?: string; ts?: number };

const valid = (i: any): i is Intent =>
  !!i && typeof i.plan === 'string' && i.plan.length > 0 && (!i.ts || Date.now() - i.ts < MAX_AGE_MS);

export function readIntent(user: any): Intent | null {
  if (!user || sessionStorage.getItem(USED_KEY)) return null;
  let local: any = null;
  try { local = JSON.parse(localStorage.getItem(CHECKOUT_INTENT_KEY) ?? 'null'); } catch { /* ignora */ }
  if (valid(local)) return local;
  const meta = user.user_metadata?.checkout_intent;
  return valid(meta) ? meta : null;
}

export function checkoutUrl(i: Intent) {
  const qs = new URLSearchParams({ plan: i.plan, cycle: i.cycle ?? 'monthly' });
  if (i.module) qs.set('module', i.module);
  return `/dashboard/checkout?${qs.toString()}`;
}

export async function clearIntent(user: any) {
  if (sessionStorage.getItem(USED_KEY)) return;
  sessionStorage.setItem(USED_KEY, '1');
  localStorage.removeItem(CHECKOUT_INTENT_KEY);
  if (user?.user_metadata?.checkout_intent) {
    await supabase.auth.updateUser({ data: { checkout_intent: null } });
  }
}

export default function AuthRedirect() {
  const { user } = useAuth();
  const { loading, needsOnboarding, storeId } = useLoja();
  const intent = readIntent(user);
  const ready = !!intent && !loading && !needsOnboarding && !!storeId;

  useEffect(() => {
    if (ready) void clearIntent(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (intent && loading) return null;
  if (ready && intent) return <Navigate to={checkoutUrl(intent)} replace />;
  return <Navigate to="/dashboard" replace />;
}