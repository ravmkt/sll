import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  const { user } = useAuth();
  const { store, loading } = useLoja();
  const location = useLocation();
  const [isSuperDb, setIsSuperDb] = useState<boolean | null>(null);
  const [paidCheck, setPaidCheck] = useState<{ sid: string; paid: boolean } | null>(null);

  // SuperAdmin validado no banco (public.is_superadmin -> admin_superusers)
  useEffect(() => {
    let alive = true;
    if (!user) {
      setIsSuperDb(false);
      return;
    }
    setIsSuperDb(null);
    (supabase as any).rpc('is_superadmin').then(
      ({ data, error }: { data: unknown; error: unknown }) => {
        if (alive) setIsSuperDb(!error && data === true);
      },
      () => {
        if (alive) setIsSuperDb(false);
      }
    );
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Assinatura paga (qualquer modulo) mantem o acesso depois do trial
  const sid = store?.id;
  useEffect(() => {
    if (!sid) return;
    let alive = true;
    (supabase as any)
      .from('subscriptions')
      .select('id')
      .eq('store_id', sid)
      .eq('is_current', true)
      .in('status', ['active', 'lifetime', 'past_due'])
      .limit(1)
      .then(
        ({ data, error }: { data: unknown[] | null; error: unknown }) => {
          if (alive) setPaidCheck({ sid, paid: !error && !!data && data.length > 0 });
        },
        () => {
          if (alive) setPaidCheck({ sid, paid: false });
        }
      );
    return () => {
      alive = false;
    };
  }, [sid]);

  // null = ainda consultando (resultado so vale para a loja atual)
  const hasPaidSub: boolean | null = !sid ? false : paidCheck?.sid === sid ? paidCheck.paid : null;

  if (loading || isSuperDb === null || hasPaidSub === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#0094eb]/30 border-t-[#0094eb] rounded-full animate-spin" />
      </div>
    );
  }

  const isSuperAdmin =
    isSuperDb ||
    user?.app_metadata?.role === 'superadmin' ||
    user?.user_metadata?.role === 'superadmin';

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Usuário novo ainda sem loja: aguarda o onboarding criar (não bloqueia)
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#0094eb]/30 border-t-[#0094eb] rounded-full animate-spin" />
      </div>
    );
  }

  const status = (store?.subscription_status || '').toLowerCase();
  const isTrialActive = store?.trial_ends_at
    ? new Date(store.trial_ends_at).getTime() > Date.now()
    : status === 'trialing';

  const hasAccess = status === 'active' || status === 'lifetime' || status === 'paid' || hasPaidSub === true || isTrialActive;

  if (!hasAccess) {
    return <Navigate to="/planos-bloqueio" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};