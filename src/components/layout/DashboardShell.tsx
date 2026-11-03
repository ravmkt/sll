import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardFrame, InShellContext } from '@/components/layout/DashboardLayout';

// Rotas que usam DashboardLayout. O cabecalho e o sidebar ficam montados entre elas.
const EXACT = ['/dashboard'];
const PREFIX = [
  '/dashboard/produtos',
  '/dashboard/medidas',
  '/dashboard/afiliados',
  '/dashboard/settings',
  '/dashboard/integracao',
  '/dashboard/assinaturas',
  '/dashboard/planos',
  '/dashboard/insights-noah',
  '/dashboard/dicas',
  '/dashboard/metricas',
  '/dashboard/pedidos-dos-lojistas',
];

function inShell(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return EXACT.includes(p) || PREFIX.some((x) => p === x || p.startsWith(x + '/'));
}

function ContentLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094eb]/20 border-t-[#0094eb]" />
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (!inShell(pathname)) return <>{children}</>;
  return (
    <InShellContext.Provider value={true}>
      <DashboardFrame>
        <Suspense fallback={<ContentLoader />}>{children}</Suspense>
      </DashboardFrame>
    </InShellContext.Provider>
  );
}