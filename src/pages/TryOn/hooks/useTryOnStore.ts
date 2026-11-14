import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TryOnStore {
  id: string;
  name: string | null;
}

export function useTryOnStore() {
  const [store, setStore] = useState<TryOnStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .order('created_at', { ascending: true })
        .limit(1);
      if (!alive) return;
      if (error) setError(error.message);
      else if (!data || data.length === 0) setError('Nenhuma loja encontrada para este usuario.');
      else setStore(data[0] as TryOnStore);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { store, loading, error };
}