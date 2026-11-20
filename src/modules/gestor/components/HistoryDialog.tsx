import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StockHistoryPanel from './StockHistoryPanel';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export default function HistoryDialog({ open, onOpenChange }: Props) {
  // O Dialog renderiza fora do layout; copia a fonte real do app para manter a identidade visual.
  const fontFamily = useMemo(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const el = document.querySelector('main') || document.getElementById('root') || document.body;
    return getComputedStyle(el).fontFamily;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ fontFamily }}
        className="flex max-h-[90vh] w-full max-w-6xl flex-col gap-4 overflow-y-auto sll-scroll !rounded-[36px] border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:!rounded-[36px]"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-900">Histórico de movimentações</DialogTitle>
        </DialogHeader>
        {open && <StockHistoryPanel />}
      </DialogContent>
    </Dialog>
  );
}