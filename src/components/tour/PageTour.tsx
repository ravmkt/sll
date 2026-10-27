import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb } from 'lucide-react';
import { usePageTour, visibleSteps, type TourStep } from '@/hooks/usePageTour';

type Props = { tourKey: string; steps: TourStep[]; inline?: boolean };

export default function PageTour({ tourKey, steps, inline = false }: Props) {
  const { start } = usePageTour(tourKey, steps);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const [hosted, setHosted] = useState<boolean>(() => !!(window as any).__sllTourHost);
  const [visible, setVisible] = useState<boolean>(inline);

  useEffect(() => {
    if (inline) return;
    const w = window as any;
    const reg: Set<string> = (w.__sllTourReg = w.__sllTourReg || new Set<string>());
    const publish = () => {
      const on = reg.size > 0;
      if (w.__sllTourAvailable === on) return;
      w.__sllTourAvailable = on;
      window.dispatchEvent(new CustomEvent('sll:tour-available', { detail: on }));
    };
    const check = () => {
      const v = visibleSteps(stepsRef.current).length > 0;
      setVisible(v);
      if (v) reg.add(tourKey); else reg.delete(tourKey);
      publish();
    };
    const sync = () => setHosted(!!w.__sllTourHost);
    sync();
    check();
    const timer = window.setInterval(check, 500);
    window.addEventListener('sll:tour-host', sync);
    window.addEventListener('sll:tour-start', start);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('sll:tour-host', sync);
      window.removeEventListener('sll:tour-start', start);
      reg.delete(tourKey);
      publish();
    };
  }, [inline, tourKey, start]);

  if (!inline && (hosted || !visible)) return null;

  const btn = (
    <button
      type="button"
      onClick={start}
      title={"Ver tour desta p\u00e1gina"}
      className={
        inline
          ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]'
          : 'fixed bottom-5 right-5 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-lg hover:border-[#0094eb] hover:text-[#0094eb]'
      }
    >
      <Lightbulb className="h-4 w-4 text-[#fd8539]" />
      <span className={inline ? '' : 'hidden sm:inline'}>{"Ver tour desta p\u00e1gina"}</span>
    </button>
  );

  return inline ? btn : createPortal(btn, document.body);
}