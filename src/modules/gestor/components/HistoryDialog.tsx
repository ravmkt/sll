import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StockHistoryPanel from './StockHistoryPanel';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

// Cor da barra de rolagem (troque aqui se quiser outra, ex.: '#16a34a' para verde)
const SCROLL_COLOR = '#0094eb';
const SCROLL_COLOR_HOVER = '#0082cf';

const SCROLL_CSS = `
.sll-hist-scroll::-webkit-scrollbar { width: 14px; height: 14px; }
.sll-hist-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
.sll-hist-scroll::-webkit-scrollbar-corner { background: transparent; }
.sll-hist-scroll::-webkit-scrollbar-track { background: transparent; margin: 14px 0; }
.sll-hist-scroll::-webkit-scrollbar-thumb {
  background-color: ${SCROLL_COLOR};
  border-radius: 999px;
  border: 4px solid transparent;
  background-clip: padding-box;
}
.sll-hist-scroll::-webkit-scrollbar-thumb:hover { background-color: ${SCROLL_COLOR_HOVER}; }
@supports not selector(::-webkit-scrollbar) {
  .sll-hist-scroll { scrollbar-width: thin; scrollbar-color: ${SCROLL_COLOR} transparent; }
}
`;

export default function HistoryDialog({ open, onOpenChange }: Props) {
  // O Dialog renderiza em portal; copia a fonte real do app para manter a mesma tipografia.
  const fontFamily = useMemo(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const el = document.getElementById('root') || document.body;
    return getComputedStyle(el).fontFamily;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ fontFamily }}
        className="flex h-[90vh] w-full max-w-6xl flex-col gap-0 overflow-hidden border-0 bg-white p-0 text-slate-800 shadow-2xl outline-none focus:outline-none focus-visible:outline-none sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100"
      >
        <style>{SCROLL_CSS}</style>
        <DialogHeader className="shrink-0 space-y-0 border-b border-slate-200 px-6 py-4 pr-14 text-left dark:border-slate-700">
          <DialogTitle className="text-xl font-extrabold leading-tight tracking-normal text-slate-800 dark:text-white">
            Histórico de movimentações
          </DialogTitle>
        </DialogHeader>
        <div className="sll-hist-scroll min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-5 dark:bg-slate-950">
          {open && <StockHistoryPanel />}
        </div>
      </DialogContent>
    </Dialog>
  );
}