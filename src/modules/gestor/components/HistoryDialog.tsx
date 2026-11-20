import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StockHistoryPanel from './StockHistoryPanel';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export default function HistoryDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-6xl flex-col gap-4 overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Histórico de movimentações</DialogTitle>
        </DialogHeader>
        {open && <StockHistoryPanel />}
      </DialogContent>
    </Dialog>
  );
}