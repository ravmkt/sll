import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SLLDatabaseService } from '@/services/SLLDatabaseService';

interface LojaContextData {
  store: any | null;
  storeId: string | null;
  loading: boolean;
  needsOnboarding: boolean;
  refreshStore: () => Promise<void>;
  setStoreManually: (store: any) => void;
}

const LojaContext = createContext<LojaContextData>({} as LojaContextData);

export const LojaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchStore = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStore(null);
        setNeedsOnboarding(false);
        return;
      }

      const userStore = await SLLDatabaseService.getUserStore(user.id);

      if (userStore) {
        setStore(userStore);
        setNeedsOnboarding(false);
        localStorage.setItem('sll_store_id', userStore.id);
        localStorage.setItem('store_id', userStore.id);
      } else {
        setStore(null);
        setNeedsOnboarding(true);
        localStorage.removeItem('sll_store_id');
        localStorage.removeItem('store_id');
      }
    } catch (err) {
      console.error('Falha ao obter loja do usuário no LojaContext:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchStore();
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const setStoreManually = (newStore: any) => {
    setStore(newStore);
    setNeedsOnboarding(false);
    if (newStore?.id) {
      localStorage.setItem('sll_store_id', newStore.id);
      localStorage.setItem('store_id', newStore.id);
    }
  };

  return (
    <LojaContext.Provider
      value={{
        store,
        storeId: store?.id || null,
        loading,
        needsOnboarding,
        refreshStore: fetchStore,
        setStoreManually,
      }}
    >
      {children}
    </LojaContext.Provider>
  );
};

export const useLoja = () => useContext(LojaContext);