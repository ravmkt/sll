import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  const { user } = useAuth();
  const { store, loading } = useLoja();
  const location = useLocation();

  // Enquanto carrega a loja, exibe loader sutil
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#0094eb]/30 border-t-[#0094eb] rounded-full animate-spin" />
      </div>
    );
  }

  // 1. SuperAdmin (Rodrigo / role de admin) tem acesso total
  const isSuperAdmin =
    user?.email?.toLowerCase().includes('rodrigo') ||
    user?.app_metadata?.role === 'superadmin' ||
    user?.user_metadata?.role === 'superadmin';

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // 2. Verifica status de assinatura / período de teste / vitalício
  const status = (store?.subscription_status || '').toLowerCase();
  const isTrialActive =
    (store?.trial_ends_at ? new Date(store.trial_ends_at).getTime() > Date.now() : status === 'trialing');

  const hasAccess = status === 'active' || status === 'lifetime' || status === 'paid' || isTrialActive;

  // Se não tem acesso liberado, redireciona para a landing page de bloqueio/upgrade
  if (!hasAccess) {
    return <Navigate to="/planos-bloqueio" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
