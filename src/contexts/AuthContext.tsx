import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabasePublic as supabase } from '../services/supabaseClients';
import { clearOfflineCache, storedSession } from '../lib/offlineCache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession();

        // Sem internet: usa a sessao guardada no aparelho
        if (!session && !navigator.onLine) session = storedSession();

        // Valida se o usuario ainda existe (token orfao de conta excluida) - so online
        if (session && navigator.onLine) {
          const { error } = await supabase.auth.getUser();
          if (error && (error.status === 401 || error.status === 403 || error.status === 404)) {
            await supabase.auth.signOut({ scope: 'local' });
            clearOfflineCache();
            if (!active) return;
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }

        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch {
        const s = storedSession();
        if (!active) return;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    };

    init();

    // Escuta mudancas de autenticacao
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT') clearOfflineCache();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    clearOfflineCache();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};