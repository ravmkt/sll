import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';

// Aparece so durante o trial (sem assinatura paga). Some sozinho quando o teste termina ou o plano e contratado.
export function TrialPill() {
  const { store } = useLoja() as { store: any };
  const navigate = useNavigate();

  const end = store?.trial_ends_at ? new Date(store.trial_ends_at).getTime() : 0;
  const left = end - Date.now();
  if (store?.subscription_status !== 'trialing' || left <= 0) return null;

  const days = Math.ceil(left / 86400000);
  const urgent = days <= 2;
  const text = days === 1 ? 'Último dia de teste' : `Teste: restam ${days} dias`;

  return (
    <button
      type="button"
      onClick={() => navigate('/dashboard/planos')}
      title="Escolher plano definitivo"
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
        urgent
          ? 'border-[#fd8539]/50 bg-[#fd8539]/10 text-[#c2571a] hover:bg-[#fd8539]/20'
          : 'border-[#0094eb]/30 bg-[#0094eb]/5 text-[#0073c7] hover:bg-[#0094eb]/10'
      }`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
      <span className="hidden sm:inline rounded-md bg-[#fd8539] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        Escolher plano
      </span>
    </button>
  );
}

export default TrialPill;