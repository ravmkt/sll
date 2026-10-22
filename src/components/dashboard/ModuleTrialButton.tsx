import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { startModuleTrial, TRIAL_DENIED_TEXT } from '@/services/subscriptions/startModuleTrial';

export default function ModuleTrialButton({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
        return;
      }
      window.location.assign('/dashboard');
    } catch {
      setMsg('Não foi possível iniciar o teste. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

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
        onClick={() => navigate(`/dashboard/planos?modulo=${slug}`)}
        className="cursor-pointer text-center text-xs font-bold text-slate-500 hover:text-[#0094eb] hover:underline"
      >
        Ver planos
      </button>
    </div>
  );
}