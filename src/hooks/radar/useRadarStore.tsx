import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [state, setState] = useState<RadarCtx>({ store: null, userName: '', isMaster: false, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      const { data, error } = await supabase.from('stores').select('*');
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Record<string, unknown>[];
      const saved = window.localStorage.getItem('sll_active_store_id');
      const row = rows.find((r) => r.id === saved) ?? rows[0];
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const userName = s(meta.full_name) ?? s(meta.name) ?? user?.email?.split('@')[0] ?? 'lojista';
      const store: RadarStore | null = row
        ? {
            id: String(row.id),
            name: s(row.name) ?? s(row.store_name) ?? 'Minha loja',
            url: s(row.url) ?? s(row.store_url) ?? s(row.domain),
            city: s(row.city),
            whatsapp: s(row.whatsapp) ?? s(row.phone),
            logoUrl: s(row.logo_url),
          }
        : null;
      const isMaster = (user?.app_metadata as Record<string, unknown> | undefined)?.is_superadmin === true;
      if (alive) setState({ store, userName, isMaster, loading: false, error: store ? null : 'Nenhuma loja encontrada para este usuário.' });
    })().catch((e: unknown) => {
      if (alive) setState((p) => ({ ...p, loading: false, error: e instanceof Error ? e.message : 'Erro ao carregar a loja.' }));
    });
    return () => { alive = false; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
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