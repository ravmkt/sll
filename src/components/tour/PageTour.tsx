import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb } from 'lucide-react';
import { usePageTour, type TourStep } from '@/hooks/usePageTour';

type Props = { tourKey: string; steps: TourStep[]; inline?: boolean };

export default function PageTour({ tourKey, steps, inline = false }: Props) {
  const { start } = usePageTour(tourKey, steps);
  const [hosted, setHosted] = useState(false);

  useEffect(() => {
    if (inline) return;
    const w = window as any;
    const sync = () => setHosted(!!w.__sllTourHost);
    sync();
    w.__sllTourAvailable = true;
    window.dispatchEvent(new CustomEvent('sll:tour-available', { detail: true }));
    window.addEventListener('sll:tour-host', sync);
    window.addEventListener('sll:tour-start', start);
    return () => {
      window.removeEventListener('sll:tour-host', sync);
      window.removeEventListener('sll:tour-start', start);
      w.__sllTourAvailable = false;
      window.dispatchEvent(new CustomEvent('sll:tour-available', { detail: false }));
    };
  }, [inline, start]);

  if (!inline && hosted) return null;

  const btn = (
    <button
      type="button"
      onClick={start}
      title="Ver tour desta p&aacute;gina"
      className={
        inline
          ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]'
          : 'fixed bottom-5 right-5 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-lg hover:border-[#0094eb] hover:text-[#0094eb]'
      }
    >
      <Lightbulb className="h-4 w-4 text-[#fd8539]" />
      <span className={inline ? '' : 'hidden sm:inline'}>Ver tour desta p&aacute;gina</span>
    </button>
  );

  return inline ? btn : createPortal(btn, document.body);
}