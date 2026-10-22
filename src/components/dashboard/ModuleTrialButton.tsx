import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { startModuleTrial, TRIAL_DENIED_TEXT } from '@/services/subscriptions/startModuleTrial';

export default function ModuleTrialButton({ slug, route }: { slug: string; route?: string }) {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    const db = supabase as any;
    Promise.all([
      db.from('trial_registry').select('*').eq('store_id', storeId),
      db.from('subscriptions').select('module_key').eq('store_id', storeId).eq('module_key', slug),
    ]).then(([reg, subs]: any[]) => {
      if (!alive) return;
      const inReg = (reg?.data ?? []).some((r: any) => Object.values(r).includes(slug));
      const inSubs = (subs?.data ?? []).length > 0;
      if (inReg || inSubs) setUsed(true);
    });
    return () => { alive = false; };
  }, [storeId, slug]);

  const goPlans = () => navigate(`/dashboard/planos?modulo=${slug}`);

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
        setUsed(true);
        setMsg(TRIAL_DENIED_TEXT[r.reason ?? 'trial_used']);
        return;
      }
      window.location.assign(route || '/dashboard');
    } catch {
      setMsg('Não foi possível iniciar o teste. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (used) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl border border-[#0094eb]/30 bg-gradient-to-b from-sky-50 to-white p-4 text-center">
          <p className="text-sm font-black text-slate-900">Volte a usar e impulsione suas vendas!</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Seu teste grátis já foi utilizado. Assine para ter este módulo de volta na sua loja.</p>
        </div>
        <button
          type="button"
          onClick={goPlans}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#fd8539] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-[#e07128]"
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