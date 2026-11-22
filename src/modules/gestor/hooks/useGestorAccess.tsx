import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLoja } from '@/contexts/LojaContext';
import { getMyAccess } from '../services/equipe';
import type { MemberAccess } from '../services/equipe';

export const GESTOR_BASE = '/dashboard/modules/gestor';

// Primeiro trecho da rota -> area de permissao. 'manager' = so dono e administrador.
const SEGMENT_AREA: Record<string, string> = {
  produtos: 'produtos',
  categorias: 'produtos',
  estoque: 'estoque',
  clientes: 'clientes',
  fornecedores: 'fornecedores',
  usuarios: 'configuracoes',
  pedidos: 'pedidos',
  'venda-manual': 'pedidos',
  propostas: 'pedidos',
  'notas-fiscais': 'notas_fiscais',
  expedicao: 'expedicao',
  'logistica-reversa': 'expedicao',
  'contas-a-pagar': 'financeiro',
  'contas-a-receber': 'financeiro',
  comissoes: 'financeiro',
  'controle-de-caixa': 'financeiro',
  contabilidade: 'financeiro',
  relatorios: 'relatorios',
  configuracoes: 'configuracoes',
  integracoes: 'configuracoes',
  whatsapp: 'configuracoes',
  equipe: 'manager',
};

interface AccessValue {
  loading: boolean;
  error: boolean;
  access: MemberAccess | null;
  isManager: boolean;
  can: (area: string, action?: string) => boolean;
  canPath: (path: string) => boolean;
}

const AccessContext = createContext<AccessValue>({
  loading: true,
  error: false,
  access: null,
  isManager: false,
  can: () => false,
  canPath: () => false,
});

export function GestorAccessProvider({ children }: { children: ReactNode }) {
  const { storeId, loading: lojaLoading } = useLoja();
  const [state, setState] = useState<{ loading: boolean; error: boolean; access: MemberAccess | null }>({
    loading: true, error: false, access: null,
  });

  useEffect(() => {
    if (lojaLoading) return;
    if (!storeId) { setState({ loading: false, error: false, access: null }); return; }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    getMyAccess(storeId)
      .then((a) => { if (alive) setState({ loading: false, error: false, access: a }); })
      .catch((e) => {
        console.error('[Gestor] permissoes', e);
        if (alive) setState({ loading: false, error: true, access: null });
      });
    return () => { alive = false; };
  }, [storeId, lojaLoading]);

  const value = useMemo<AccessValue>(() => {
    const a = state.access;
    const active = !!a && a.active !== false;
    const isManager = active && !!a && (a.role === 'owner' || a.role === 'admin');
    const can = (area: string, action: string = 'ver'): boolean => {
      if (!active || !a) return false;
      if (isManager) return true;
      return !!a.permissions?.[area]?.includes(action);
    };
    const canPath = (path: string): boolean => {
      const rest = path.startsWith(GESTOR_BASE) ? path.slice(GESTOR_BASE.length) : path;
      const seg = rest.split('/').filter(Boolean)[0] ?? '';
      if (seg === '') return active;
      const area = SEGMENT_AREA[seg] ?? 'manager';
      return area === 'manager' ? isManager : can(area, 'ver');
    };
    return { loading: state.loading, error: state.error, access: a, isManager, can, canPath };
  }, [state]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export const useGestorAccess = () => useContext(AccessContext);