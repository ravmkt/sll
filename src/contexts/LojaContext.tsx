import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SLLDatabaseService } from '@/services/SLLDatabaseService';

interface LojaContextData {
  store: any | null;
  storeId: string | null;
  stores: any[];
  loading: boolean;
  needsOnboarding: boolean;
  refreshStore: () => Promise<void>;
  setStoreManually: (store: any) => void;
}

const LojaContext = createContext<LojaContextData>({} as LojaContextData);

export const LojaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<any | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchStore = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStore(null);
        setStores([]);
        setNeedsOnboarding(false);
        return;
      }

      // 1. Busca todas as lojas vinculadas ao usuário
      const userStores = await SLLDatabaseService.getStores(user.id);
      setStores(userStores || []);

      if (userStores && userStores.length > 0) {
        // Prioriza a loja que já estava salva no localStorage, se existir
        const savedId = localStorage.getItem('sll_store_id') || localStorage.getItem('store_id');
        const activeStore = userStores.find((s: any) => s.id === savedId) || userStores[0];

        setStore(activeStore);
        setNeedsOnboarding(false);
        localStorage.setItem('sll_store_id', activeStore.id);
        localStorage.setItem('store_id', activeStore.id);
      } else {
        setStore(null);
        setNeedsOnboarding(true);
        localStorage.removeItem('sll_store_id');
        localStorage.removeItem('store_id');
      }
    } catch (err) {
      console.error('Falha ao obter lojas no LojaContext:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();

    // Ouve alterações de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchStore();
      }
    });

    // Ouve evento disparado após criar loja no Onboarding
    const handleStoreCreated = () => {
      fetchStore();
    };
    window.addEventListener('sll:store_created', handleStoreCreated);

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener('sll:store_created', handleStoreCreated);
    };
  }, []);

  const setStoreManually = (newStore: any) => {
    setStore(newStore);
    setStores((prev) => [newStore, ...prev.filter((s: any) => s.id !== newStore.id)]);
    setNeedsOnboarding(false);
    if (newStore?.id) {
      localStorage.setItem('sll_store_id', newStore.id);
      localStorage.setItem('store_id', newStore.id);
    }
    // Dispara evento para toda a interface atualizar a barra de loja ativa
    window.dispatchEvent(new CustomEvent('sll:store_created', { detail: newStore }));
  };

  return (
    <LojaContext.Provider
      value={{
        store,
        storeId: store?.id || null,
        stores,
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