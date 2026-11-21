import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { GESTOR_BASE, useGestorAccess } from '../hooks/useGestorAccess';

export default function AccessGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { loading, error, access, canPath } = useGestorAccess();

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !access || access.active === false) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border bg-white p-8 text-center">
        <ShieldOff className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="font-semibold">{error ? 'Não foi possível verificar suas permissões' : 'Sem acesso ao Gestor'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error ? 'Recarregue a página. Se continuar, avise o administrador da loja.' : 'Peça ao administrador da loja para liberar seu acesso.'}
        </p>
      </div>
    );
  }

  if (!canPath(pathname)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border bg-white p-8 text-center">
        <ShieldOff className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="font-semibold">Sem acesso a esta área</p>
        <p className="mt-1 text-sm text-muted-foreground">Seu perfil não tem permissão para ver esta tela.</p>
        <Link to={GESTOR_BASE} className="mt-4 inline-block text-sm font-medium text-[color:var(--sll-b-brand)] underline">Voltar à visão geral</Link>
      </div>
    );
  }

  return <>{children}</>;
}