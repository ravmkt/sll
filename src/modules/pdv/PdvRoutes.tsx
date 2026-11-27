import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useGestorAccess } from '@/modules/gestor/hooks/useGestorAccess';
import PdvPage from '@/modules/gestor/pages/PdvPage';
import OrdersPage from '@/modules/gestor/pages/OrdersPage';
import ProductsPage from '@/modules/gestor/pages/ProductsPage';
import PdvLayout, { PDV_BASE } from './components/PdvLayout';
import CashPage from './pages/CashPage';

function Need({ area, action, children }: { area: string; action: string; children: ReactNode }) {
  const { can } = useGestorAccess();
  if (can(area, action)) return <>{children}</>;
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <ShieldOff className="mx-auto mb-3 h-8 w-8 text-slate-400" />
      <p className="font-semibold">Sem acesso a esta área</p>
      <p className="mt-1 text-sm text-slate-500">Seu perfil não tem permissão para ver esta tela.</p>
    </div>
  );
}

export default function PdvRoutes() {
  return (
    <Routes>
      <Route element={<PdvLayout />}>
        <Route index element={<Need area="pedidos" action="editar"><PdvPage /></Need>} />
        <Route path="caixa" element={<Need area="pedidos" action="editar"><CashPage /></Need>} />
        <Route path="pedidos" element={<Need area="pedidos" action="ver"><OrdersPage /></Need>} />
        <Route path="produtos" element={<Need area="produtos" action="ver"><ProductsPage /></Need>} />
        <Route path="*" element={<Navigate to={PDV_BASE} replace />} />
      </Route>
    </Routes>
  );
}