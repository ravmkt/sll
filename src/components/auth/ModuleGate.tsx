import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModuleTrials } from '@/hooks/useModuleTrials';

interface ModuleGateProps {
  moduleKey: string;
  children: React.ReactNode;
}

// Bloqueia somente o modulo cujo trial venceu (sem assinatura paga/bundle cobrindo). Falha aberta.
export const ModuleGate: React.FC<ModuleGateProps> = ({ moduleKey, children }) => {
  const { loading, trials } = useModuleTrials();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#0094eb]/30 border-t-[#0094eb] rounded-full animate-spin" />
      </div>
    );
  }

  const t = trials.find((x) => x.moduleKey === moduleKey);
  if (t?.expired) {
    return <Navigate to={`/dashboard/planos?modulo=${moduleKey}`} replace />;
  }
  return <>{children}</>;
};