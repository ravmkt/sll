import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';

export interface RadarStore {
  id: string;
  name: string;
  url: string | null;
  city: string | null;
  whatsapp: string | null;
  logoUrl: string | null;
}

interface RadarCtx {
  store: RadarStore | null;
  userName: string;
  isMaster: boolean;
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<RadarCtx | null>(null);
const s = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

export function RadarStoreProvider({ children }: { children: ReactNode }) {
  const { store: raw, loading: lojaLoading } = useLoja();
  const [user, setUser] = useState<{ name: string; isMaster: boolean }>({ name: '', isMaster: false });

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const meta = (u?.user_metadata ?? {}) as Record<string, unknown>;
      const app = (u?.app_metadata ?? {}) as Record<string, unknown>;
      const name = s(meta.full_name) ?? s(meta.name) ?? u?.email?.split('@')[0] ?? 'lojista';
      if (alive) setUser({ name, isMaster: app.is_superadmin === true });
    });
    return () => { alive = false; };
  }, []);

  const value = useMemo<RadarCtx>(() => {
    const row = raw as Record<string, unknown> | null;
    const store: RadarStore | null = row && row.id
      ? {
          id: String(row.id),
          name: s(row.name) ?? s(row.store_name) ?? 'Minha loja',
          url: s(row.url) ?? s(row.store_url) ?? s(row.domain),
          city: s(row.city),
          whatsapp: s(row.whatsapp) ?? s(row.phone),
          logoUrl: s(row.logo_url) ?? s(row.logo),
        }
      : null;
    return {
      store,
      userName: user.name,
      isMaster: user.isMaster,
      loading: lojaLoading,
      error: !lojaLoading && !store ? 'Nenhuma loja encontrada para este usuário.' : null,
    };
  }, [raw, lojaLoading, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRadarCtx(): RadarCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRadarCtx fora do RadarStoreProvider');
  return c;
}

export function useActiveStore(): RadarStore {
  const { store } = useRadarCtx();
  if (!store) throw new Error('Loja ativa não carregada');
  return store;
}