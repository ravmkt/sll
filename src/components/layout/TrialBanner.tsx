import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';

const PLANOS_PATH = '/dashboard/planos';

export function TrialBanner() {
  const { state, daysLeft } = useTrialStatus();
  if (state !== 'trial' && state !== 'expired') return null;

  const expired = state === 'expired';
  const urgent = !expired && daysLeft <= 2;

  const tone = expired
    ? 'bg-gradient-to-r from-red-600 to-rose-500'
    : urgent
      ? 'bg-gradient-to-r from-orange-500 to-amber-500'
      : 'bg-gradient-to-r from-[#0094eb] to-indigo-500';

  const Icon = expired ? AlertTriangle : urgent ? Clock : Sparkles;

  const text = expired
    ? 'Seu período de teste terminou. Assine para continuar usando todas as funções.'
    : daysLeft === 1
      ? 'Falta 1 dia do seu teste gratuito. Assine agora e não perca o acesso.'
      : `Você está no teste gratuito: faltam ${daysLeft} dias. Assine e continue crescendo.`;

  return (
    <div className={`${tone} text-white px-6 py-2.5 flex items-center justify-between gap-4 shadow-sm`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={18} className="shrink-0" />
        <p className="text-sm font-semibold truncate">{text}</p>
      </div>
      <Link
        to={PLANOS_PATH}
        className="shrink-0 bg-white text-slate-900 text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        {expired ? 'Reativar agora' : 'Assinar agora'}
      </Link>
    </div>
  );
}
