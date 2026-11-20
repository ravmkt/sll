import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMemo } from 'react';
import StockHistoryPanel from './StockHistoryPanel';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const SCROLL_CSS = `
.sll-hist-scroll { scrollbar-gutter: auto; }
.sll-hist-scroll::-webkit-scrollbar { width: 18px; height: 18px; }
.sll-hist-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
.sll-hist-scroll::-webkit-scrollbar-corner { background: transparent; }
.sll-hist-scroll::-webkit-scrollbar-track { background: transparent; margin: 52px 0 36px 0; }
.sll-hist-scroll::-webkit-scrollbar-thumb {
  background-color: #0094eb;
  border-radius: 999px;
  border: 6px solid transparent;
  background-clip: padding-box;
}
.sll-hist-scroll::-webkit-scrollbar-thumb:hover { background-color: #007acc; }
@supports not selector(::-webkit-scrollbar) {
  .sll-hist-scroll { scrollbar-width: thin; scrollbar-color: #0094eb transparent; }
}
`;

export default function HistoryDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-full max-w-6xl flex-col gap-0 overflow-hidden rounded-[40px] border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#1a1f2c] dark:text-slate-100">
        <style>{SCROLL_CSS}</style>
        <div className="sll-hist-scroll min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-7">
          <DialogHeader className="mb-5">
            <DialogTitle className="text-xl font-extrabold">Histórico de movimentações</DialogTitle>
          </DialogHeader>
          {open && <StockHistoryPanel />}
        </div>
      </DialogContent>
    </Dialog>
  );
}