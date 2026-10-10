import { useLayoutEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, Sparkles, Flame } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useModuleTrials } from '@/hooks/useModuleTrials';
import TrialModulesDialog from '@/components/layout/TrialModulesDialog';

const PLANOS_PATH = '/dashboard/planos';
const BANNER_H = 44;
const EXPIRED_WINDOW_MS = 72 * 60 * 60 * 1000;

export function TrialBanner() {
  const { state, daysLeft, endsAt } = useTrialStatus();
  const { loading, hasPaid, trials } = useModuleTrials();
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  const mod = useMemo(() => {
    const active = trials.filter((t) => !t.expired).sort((a, b) => a.daysLeft - b.daysLeft)[0];
    return active ?? trials[0] ?? null;
  }, [trials]);

  const storeVisible = !loading && !hasPaid && (state === 'trial' || state === 'expired');
  const moduleVisible = !loading && !storeVisible && !!mod;
  const kind: 'store' | 'module' | null = storeVisible ? 'store' : moduleVisible ? 'module' : null;

  const isModule = kind === 'module';
  const expired = isModule ? !!mod?.expired : state === 'expired';
  const end = isModule ? mod?.endsAt ?? null : endsAt;
  const bannerId =
    kind && expired ? `sll_trial_banner:${isModule ? mod?.moduleKey : 'store'}:${end ?? 'na'}` : null;

  const expiredHidden = useMemo(() => {
    if (!bannerId) return false;
    try {
      if (localStorage.getItem(`${bannerId}:dismissed`)) return true;
      let first = Number(localStorage.getItem(`${bannerId}:first`));
      if (!first) {
        first = Date.now();
        localStorage.setItem(`${bannerId}:first`, String(first));
      }
      return Date.now() - first > EXPIRED_WINDOW_MS;
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerId, tick]);

  const visible = kind !== null && !expiredHidden;

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (visible) root.style.setProperty('--trial-h', `${BANNER_H}px`);
    else root.style.removeProperty('--trial-h');
    return () => root.style.removeProperty('--trial-h');
  }, [visible]);

  if (!visible) return null;

  const left = isModule ? mod?.daysLeft ?? 0 : daysLeft;
  const label = mod?.label ?? '';
  const last = !expired && left <= 1;
  const urgent = !expired && !last && left <= 2;
  const endsToday = !!end && new Date(end).toDateString() === new Date().toDateString();

  const tone = expired
    ? 'bg-red-700'
    : last
      ? 'bg-gradient-to-r from-red-600 to-rose-500'
      : urgent
        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
        : 'bg-gradient-to-r from-emerald-600 to-green-500';

  const Icon = expired ? AlertTriangle : last ? Flame : urgent ? Clock : Sparkles;

  const what = trials.length === 1 && label ? ` do ${label}` : '';
  let text: string;
  if (isModule) {
    text = expired
      ? `O teste${what} terminou. Assine para voltar a usar.`
      : last
        ? endsToday
          ? `Atenção: seu teste${what} vence hoje! Assine para não perder o acesso.`
          : `Atenção: seu teste${what} vence amanhã! Assine para não perder o acesso.`
        : urgent
          ? `Faltam 2 dias do seu teste${what}! Assine e continue usando.`
          : `Faltam ${left} dias do seu teste${what}. Assine para continuar.`;
  } else {
    text = expired
      ? 'Seu período de teste terminou. Assine para continuar usando todas as funções.'
      : last
        ? endsToday
          ? 'Atenção: seu teste gratuito vence hoje! Escolha um plano para não perder o acesso.'
          : 'Atenção: seu teste gratuito vence amanhã! Escolha um plano para não perder o acesso.'
        : urgent
          ? 'Faltam 2 dias do seu teste gratuito! Escolha um plano e continue vendendo mais.'
          : `Você está em período de teste gratuito: faltam ${left} dias. Escolha seu plano.`;
  }
  const to = isModule && mod ? `${PLANOS_PATH}?modulo=${mod.moduleKey}` : PLANOS_PATH;
  const cta = expired ? 'Reativar agora' : isModule ? 'Assinar' : 'Escolher plano';
  const multi = trials.length > 1;

  const dismiss = () => {
    try {
      if (bannerId) localStorage.setItem(`${bannerId}:dismissed`, '1');
    } catch {
      /* ignore */
    }
    setTick((t) => t + 1);
  };

  return (
    <>
      <style>{`body{padding-top:var(--trial-h,0px)}.min-h-screen{min-height:calc(100vh - var(--trial-h,0px))!important}aside{top:var(--trial-h,0px)!important;height:calc(100vh - var(--trial-h,0px))!important}`}</style>
      <div
        className={`${tone} text-white fixed top-0 left-0 right-0 z-[60] px-4 sm:px-6 flex items-center justify-center gap-3 sm:gap-5 shadow-md`}
        style={{ height: BANNER_H }}
      >
        <Icon size={18} className="shrink-0" />
        <p className="text-xs sm:text-sm font-bold truncate">{text}</p>
        {multi ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 bg-white text-slate-900 text-xs font-extrabold uppercase tracking-wide px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {cta}
          </button>
        ) : (
          <Link
            to={to}
            className="shrink-0 bg-white text-slate-900 text-xs font-extrabold uppercase tracking-wide px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {cta}
          </Link>
        )}
        {expired && (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-white/90 hover:text-white text-xs font-semibold underline underline-offset-2"
          >
            Não, obrigado
          </button>
        )}
      </div>
      {open && <TrialModulesDialog trials={trials} onClose={() => setOpen(false)} />}
    </>
  );
}

