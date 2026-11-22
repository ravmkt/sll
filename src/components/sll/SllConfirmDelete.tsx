import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { SllModal } from '@/components/sll/SllModal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemName: string;
  note?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
};

const btn =
  'inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60';

export default function SllConfirmDelete({
  open, onOpenChange, title, itemName, note, confirmLabel = 'Excluir', busy = false, onConfirm,
}: Props) {
  return (
    <SllModal open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }} title={title}>
      <div className="space-y-5">
        <div className="flex justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-800/40 dark:bg-amber-950/30">
            <AlertTriangle size={36} strokeWidth={2} />
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="space-y-1">
            <p>
              Esta ação é irreversível. O item <strong>"{itemName}"</strong> será removido permanentemente.
            </p>
            {note && <p className="text-xs opacity-90">{note}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className={btn + ' border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800'}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={btn + ' bg-[color:var(--sll-b-brand)] text-white hover:bg-[color:var(--sll-b-brand-hover)]'}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </div>
    </SllModal>
  );
}