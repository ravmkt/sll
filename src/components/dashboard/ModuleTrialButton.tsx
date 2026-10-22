import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { startModuleTrial, TRIAL_DENIED_TEXT } from '@/services/subscriptions/startModuleTrial';

type CardState = 'loading' | 'none' | 'trialing' | 'active' | 'used';

export default function ModuleTrialButton({ slug, route }: { slug: string; route?: string }) {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const [state, setState] = useState<CardState>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const target = route || '/dashboard';
  const goPlans = () => navigate(`/dashboard/planos?modulo=${slug}`);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('store_id', storeId)
        .eq('module_key', slug);
      if (!alive) return;
      const rows = (data || []) as { status: string; current_period_end: string | null }[];
      const now = Date.now();
      const live = rows.find(
        (r) => (r.status === 'trialing' || r.status === 'active') &&
          (!r.current_period_end || new Date(r.current_period_end).getTime() > now)
      );
      if (live?.status === 'active') return setState('active');
      if (live) {
        const end = live.current_period_end ? new Date(live.current_period_end).getTime() : now;
        setDaysLeft(Math.max(0, Math.ceil((end - now) / 86400000)));
        return setState('trialing');
      }
      setState(rows.length > 0 ? 'used' : 'none');
    })();
    return () => { alive = false; };
  }, [storeId, slug]);

  const start = async () => {
    if (!storeId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await startModuleTrial(storeId, slug);
      if (r.status === 'denied') {
        if (r.reason === 'store_url_required') {
          navigate('/dashboard/onboarding');
          return;
        }
        setMsg(TRIAL_DENIED_TEXT[r.reason ?? 'trial_used']);
        setState('used');
        return;
      }
      window.location.assign(target);
    } catch {
      setMsg('Não foi possível iniciar o teste. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <div className="h-10 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (state === 'trialing') {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60 px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Sparkles className="h-3 w-3" /> Em teste
          </span>
          <p className="mt-1.5 text-lg font-extrabold leading-tight text-emerald-900">
            {daysLeft === 0 ? 'Último dia de teste' : daysLeft === 1 ? 'Falta 1 dia' : `Faltam ${daysLeft} dias`}
          </p>
          <p className="text-xs font-semibold text-emerald-800">E agora? Assine para continuar vendendo.</p>
          <button
            type="button"
            onClick={goPlans}
            className="mt-2 cursor-pointer rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Assinar
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(target)}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]"
        >
          Acessar painel <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (state === 'active') {
    return (
      <button
        type="button"
        onClick={() => navigate(target)}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]"
      >
        Acessar painel <ArrowRight className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (state === 'used') {
    return (
      <div className="flex flex-col gap-2">
        {msg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{msg}</p>}
        <button
          type="button"
          onClick={goPlans}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]"
        >
          Assinar <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={busy || !storeId}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Iniciando teste...</>
        ) : (
          <>Testar grátis <ArrowRight className="h-3.5 w-3.5" /></>
        )}
      </button>
      {msg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{msg}</p>}
      <button
        type="button"
        onClick={goPlans}
        className="cursor-pointer text-center text-xs font-bold text-slate-500 hover:text-[#0094eb] hover:underline"
      >
        Ver planos
      </button>
    </div>
  );
}