import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

let cached: boolean | null = null;

export function useIsSuperadmin(): boolean {
  const [ok, setOk] = useState<boolean>(cached === true);

  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    (supabase as any)
      .rpc('is_superadmin')
      .then(({ data, error }: any) => {
        cached = !error && data === true;
        if (alive) setOk(cached);
      });
    return () => { alive = false; };
  }, []);

  return ok;
}