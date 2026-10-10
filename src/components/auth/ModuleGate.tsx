import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';

interface ModuleGateProps {
  moduleKey: string;
  children: React.ReactNode;
}

// Libera o modulo somente se a loja o tiver contratado (ativo ou trial no prazo). Falha fechado.
export const ModuleGate: React.FC<ModuleGateProps> = ({ moduleKey, children }) => {
  const { store, loading: lojaLoading } = useLoja();
  const sid = store?.id;
  const key = sid ? `${sid}:${moduleKey}` : null;
  const [res, setRes] = useState<{ key: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (!sid || !key) return;
    let alive = true;
    (async () => {
      try {
        const { data: isSuper } = await (supabase as any).rpc('is_superadmin');
        if (isSuper === true) {
          if (alive) setRes({ key, allowed: true });
          return;
        }
        const { data, error } = await (supabase as any).rpc('get_store_active_modules', { p_store_id: sid });
        if (error) console.error('[ModuleGate] get_store_active_modules:', error);
        const mods: string[] = !error && Array.isArray(data) ? data : [];
        if (alive) setRes({ key, allowed: mods.includes(moduleKey) });
      } catch (e) {
        console.error('[ModuleGate]', e);
        if (alive) setRes({ key, allowed: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [sid, key, moduleKey]);

  if (lojaLoading || (key && res?.key !== key)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#0094eb]/30 border-t-[#0094eb] rounded-full animate-spin" />
      </div>
    );
  }

  if (!key || !res?.allowed) {
    return <Navigate to={`/dashboard/planos?modulo=${moduleKey}`} replace />;
  }
  return <>{children}</>;
};
