import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

/** Vao do menu lateral que hospeda o botao "Ver tour desta pagina". Padrao de todos os modulos. */
export default function SidebarTourSlot({ isExpanded }: { isExpanded: boolean }) {
  const [hasTour, setHasTour] = useState<boolean>(() => !!(window as any).__sllTourAvailable);

  useEffect(() => {
    const w = window as any;
    w.__sllTourHost = true;
    window.dispatchEvent(new Event('sll:tour-host'));
    const on = (e: Event) => setHasTour(!!(e as CustomEvent).detail);
    window.addEventListener('sll:tour-available', on);
    return () => {
      w.__sllTourHost = false;
      window.removeEventListener('sll:tour-available', on);
      window.dispatchEvent(new Event('sll:tour-host'));
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4">
      {hasTour && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('sll:tour-start'))}
          title="Ver tour desta p&aacute;gina"
          className={`inline-flex cursor-pointer items-center justify-center gap-2 border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition-colors hover:border-[#0094eb] hover:text-[#0094eb] ${
            isExpanded ? 'w-full rounded-full px-3.5 py-2.5' : 'h-10 w-10 rounded-full'
          }`}
        >
          <Lightbulb size={16} className="shrink-0 text-[#fd8539]" />
          {isExpanded && <span>Ver tour desta p&aacute;gina</span>}
        </button>
      )}
    </div>
  );
}