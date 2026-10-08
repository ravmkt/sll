import { useCallback, useState } from 'react';
import { checkQuota, type QuotaKind, type QuotaState } from '@/services/quotaService';

// guard() devolve true se pode seguir. Se estourou, abre o estado "blocked" para o modal.
// Falha de rede libera a acao: o trigger do banco continua barrando no servidor.
export function useQuotaGuard(storeId: string | undefined | null) {
  const [blocked, setBlocked] = useState<QuotaState | null>(null);

  const guard = useCallback(
    async (kind: QuotaKind, extra = 0): Promise<boolean> => {
      if (!storeId) return true;
      try {
        const q = await checkQuota(storeId, kind, extra);
        if (q && !q.allowed) {
          setBlocked(q);
          return false;
        }
        return true;
      } catch {
        return true;
      }
    },
    [storeId],
  );

  const showBlocked = useCallback((kind: QuotaKind | 'module_inactive') => {
    setBlocked({
      allowed: false,
      level: 'blocked',
      kind: kind === 'module_inactive' ? 'videos' : kind,
      reason: kind === 'module_inactive' ? 'module_inactive' : undefined,
      used: 0,
      limit: null,
      pct: null,
    });
  }, []);

  return { guard, blocked, showBlocked, close: () => setBlocked(null) };
}