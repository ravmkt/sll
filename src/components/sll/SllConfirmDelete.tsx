import { AlertTriangle } from 'lucide-react';
import { SllModal } from './SllModal';

type Props = {
  open: boolean;
  busy?: boolean;
  title?: string;
  itemName: string;
  note?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function SllConfirmDelete({ open, busy, title = 'Excluir', itemName, note, onCancel, onConfirm }: Props) {
  return (
    <SllModal
      open={open}
      onOpenChange={(o) => { if (!o && !busy) onCancel(); }}
      title={title.toUpperCase()}
      size="md"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle size={36} className="text-amber-500" />
        </div>
        <div className="flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <p>
            Esta ação é irreversível. O item <strong>&quot;{itemName}&quot;</strong> será removido permanentemente.
            {note ? ' ' + note : ''}
          </p>
        </div>
        <div className="flex w-full gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-full bg-[color:var(--sll-b-brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--sll-b-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </SllModal>
  );
}