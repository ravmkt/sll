import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const cache = new Map<string, boolean>();

// Verifica no banco se o usuario logado e SuperAdmin. Cache por usuario; erros nao sao guardados.
export function useIsSuperadmin(): boolean {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      const { data: auth } = await sb.auth.getUser();
      const uid: string | undefined = auth?.user?.id;
      if (!uid) { if (alive) setOk(false); return; }
      if (cache.has(uid)) { if (alive) setOk(cache.get(uid) === true); return; }
      const { data, error } = await sb.rpc('is_superadmin');
      if (error) { if (alive) setOk(false); return; }
      cache.set(uid, data === true);
      if (alive) setOk(data === true);
    };

    check();
    const { data: sub } = sb.auth.onAuthStateChange(() => { check(); });
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  return ok;
}