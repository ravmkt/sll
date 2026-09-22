import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SLLDatabaseService } from '../services/SLLDatabaseService';
import { useAuth } from './AuthContext';

export interface Store {
  id: string;
  name: string;
  domain?: string;
  logo_url?: string;
  plan_id?: string;
  created_at?: string;
  [key: string]: any;
}

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  setCurrentStore: (store: Store) => void;
  loadingStores: boolean;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  stores: [],
  currentStore: null,
  setCurrentStore: () => {},
  loadingStores: true,
  refreshStores: async () => {},
});

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loadingStores, setLoadingStores] = useState<boolean>(true);

  const fetchStores = async () => {
    if (!user) {
      setStores([]);
      setCurrentStore(null);
      setLoadingStores(false);
      return;
    }

    try {
      setLoadingStores(true);
      const data = await SLLDatabaseService.getStores();
      const list = (data as Store[]) || [];
      setStores(list);

      // Mantém a loja atual ou seleciona a primeira da lista
      if (list.length > 0) {
        const savedStoreId = localStorage.getItem('sll_active_store_id');
        const found = list.find((s) => s.id === savedStoreId);
        const active = found || list[0];
        setCurrentStore(active);
        localStorage.setItem('sll_active_store_id', active.id);
      } else {
        setCurrentStore(null);
      }
    } catch (err) {
      console.error('Erro ao buscar lojas:', err);
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [user]);

  const handleSetCurrentStore = (store: Store) => {
    setCurrentStore(store);
    localStorage.setItem('sll_active_store_id', store.id);
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        currentStore,
        setCurrentStore: handleSetCurrentStore,
        loadingStores,
        refreshStores: fetchStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore deve ser usado dentro de um StoreProvider');
  }
  return context;
};
