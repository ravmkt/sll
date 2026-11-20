import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GestorPage from '../pages/GestorPage';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export default function HistoryDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] w-full max-w-6xl overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Histórico de movimentações</DialogTitle>
        </DialogHeader>
        {open && <GestorPage />}
      </DialogContent>
    </Dialog>
  );
}