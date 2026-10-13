import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';

// undefined = carregando; null = loja sem setor; string = sector_id
export function useStoreSector(): string | null | undefined {
  const ctx = useLoja() as any;
  const storeId: string | undefined = ctx?.store?.id ?? ctx?.storeId;
  const fromStore: string | undefined = ctx?.store?.sector_id ?? undefined;
  const [sid, setSid] = useState<string | null | undefined>(fromStore);

  useEffect(() => {
    if (fromStore) { setSid(fromStore); return; }
    if (!storeId) return;
    let alive = true;
    (supabase as any)
      .from('stores')
      .select('sector_id')
      .eq('id', storeId)
      .maybeSingle()
      .then(({ data }: any) => { if (alive) setSid(data?.sector_id ?? null); });
    return () => { alive = false; };
  }, [storeId, fromStore]);

  return sid;
}