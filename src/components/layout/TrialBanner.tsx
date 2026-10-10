import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, Sparkles, Flame } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';

const PLANOS_PATH = '/dashboard/planos';
const BANNER_H = 44;

export function TrialBanner() {
  const { state, daysLeft, endsAt } = useTrialStatus();
  const visible = state === 'trial' || state === 'expired';

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (visible) root.style.setProperty('--trial-h', `${BANNER_H}px`);
    else root.style.removeProperty('--trial-h');
    return () => root.style.removeProperty('--trial-h');
  }, [visible]);

  if (!visible) return null;

  const expired = state === 'expired';
  const last = !expired && daysLeft <= 1;
  const urgent = !expired && !last && daysLeft <= 2;
  const endsToday = !!endsAt && new Date(endsAt).toDateString() === new Date().toDateString();

  const tone = expired
    ? 'bg-red-700'
    : last
      ? 'bg-gradient-to-r from-red-600 to-rose-500'
      : urgent
        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
        : 'bg-gradient-to-r from-emerald-600 to-green-500';

  const Icon = expired ? AlertTriangle : last ? Flame : urgent ? Clock : Sparkles;

  const text = expired
    ? 'Seu período de teste terminou. Assine para continuar usando todas as funções.'
    : last
      ? endsToday
        ? 'Atenção: seu teste gratuito vence hoje! Escolha um plano para não perder o acesso.'
        : 'Atenção: seu teste gratuito vence amanhã! Escolha um plano para não perder o acesso.'
      : urgent
        ? 'Faltam 2 dias do seu teste gratuito! Escolha um plano e continue vendendo mais.'
        : `Você está em período de teste gratuito: faltam ${daysLeft} dias. Escolha seu plano.`;

  return (
    <>
      <style>{`aside{top:var(--trial-h,0px)!important;height:calc(100vh - var(--trial-h,0px))!important}`}</style>
      <div
        className={`${tone} text-white fixed top-0 left-0 right-0 z-[60] px-4 sm:px-6 flex items-center justify-center gap-3 sm:gap-5 shadow-md`}
        style={{ height: BANNER_H }}
      >
        <Icon size={18} className="shrink-0" />
        <p className="text-xs sm:text-sm font-bold truncate">{text}</p>
        <Link
          to={PLANOS_PATH}
          className="shrink-0 bg-white text-slate-900 text-xs font-extrabold uppercase tracking-wide px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {expired ? 'Reativar agora' : 'Escolher plano'}
        </Link>
      </div>
    </>
  );
}
