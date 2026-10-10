import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;
export const ONBOARDING_SKIP_KEY = 'sll_onboarding_skip';
export const ONBOARDING_DONE_EVENT = 'sll:onboarding-completed';

// Redireciona para o wizard enquanto onboarding_completed = false. Falha aberta em caso de erro.
export function OnboardingGuard() {
  const { pathname, search } = useLocation();
  const qs = new URLSearchParams(search);
  const oauthReturn = (qs.has('code') && qs.has('state')) || qs.has('tiktok');
  const guarded = pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/onboarding') && !oauthReturn;
  const [status, setStatus] = useState<'loading' | 'pending' | 'ok'>('loading');
  const done = useRef(false);

  useEffect(() => {
    const onDone = () => { done.current = true; setStatus('ok'); };
    window.addEventListener(ONBOARDING_DONE_EVENT, onDone);
    return () => window.removeEventListener(ONBOARDING_DONE_EVENT, onDone);
  }, []);

  useEffect(() => {
    if (!guarded || done.current) return;
    let alive = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) { if (alive) setStatus('ok'); return; }
        const { data, error } = await sb.from('stores').select('onboarding_completed')
          .eq('owner_user_id', auth.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (!alive) return;
        if (error || !data || data.onboarding_completed) { done.current = !!data?.onboarding_completed; setStatus('ok'); return; }
        setStatus('pending');
      } catch { if (alive) setStatus('ok'); }
    })();
    return () => { alive = false; };
  }, [guarded, pathname === '/dashboard' ? 1 : 0]);

  if (!guarded) return null;
  if (status === 'loading') {
    return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }
  if (status === 'pending') {
    if (sessionStorage.getItem(ONBOARDING_SKIP_KEY) !== '1') return <Navigate to="/dashboard/onboarding" replace />;
    return (
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-xs text-amber-900">
          <p className="font-bold">Configuração da loja pendente</p>
          <p className="mt-0.5">Conclua o setup para conectar o script e remover este aviso.</p>
          <Link to="/dashboard/onboarding" className="mt-2 inline-block font-bold underline">Concluir agora</Link>
        </div>
      </div>
    );
  }
  return null;
}