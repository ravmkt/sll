import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isSuperAdmin } from '@/services/admin/adminMaster';

export function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    let alive = true;
    isSuperAdmin()
      .then((ok) => alive && setState(ok === true ? 'ok' : 'denied'))
      .catch(() => alive && setState('denied'));
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }
  if (state === 'denied') return <Navigate to="/" replace />;
  return <>{children}</>;
}