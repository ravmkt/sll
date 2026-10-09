import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const CHECKOUT_INTENT_KEY = 'sll_checkout_intent';
type Intent = { plan: string; cycle?: string; module?: string };

const valid = (i: any): i is Intent => !!i && typeof i.plan === 'string' && i.plan.length > 0;

export default function AuthRedirect() {
  const { user } = useAuth();
  const meta = (user as any)?.user_metadata?.checkout_intent;

  let local: any = null;
  try { local = JSON.parse(localStorage.getItem(CHECKOUT_INTENT_KEY) ?? 'null'); } catch { /* ignora */ }

  const intent: Intent | null = user ? (valid(local) ? local : valid(meta) ? meta : null) : null;

  useEffect(() => {
    if (!intent) return;
    localStorage.removeItem(CHECKOUT_INTENT_KEY);
    if (valid(meta)) void supabase.auth.updateUser({ data: { checkout_intent: null } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!intent) return <Navigate to="/dashboard" replace />;

  const qs = new URLSearchParams({ plan: intent.plan, cycle: intent.cycle ?? 'monthly' });
  if (intent.module) qs.set('module', intent.module);
  return <Navigate to={`/dashboard/checkout?${qs.toString()}`} replace />;
}