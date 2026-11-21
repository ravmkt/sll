import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const SIZE = { md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' } as const;

const SCROLL_CSS = `
.sll-scroll::-webkit-scrollbar { width: 14px; height: 14px; }
.sll-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
.sll-scroll::-webkit-scrollbar-corner { background: transparent; }
.sll-scroll::-webkit-scrollbar-track { background: transparent; margin: 14px 0; }
.sll-scroll::-webkit-scrollbar-thumb {
  background-color: var(--sll-b-brand);
  border-radius: 999px;
  border: 4px solid transparent;
  background-clip: padding-box;
}
.sll-scroll::-webkit-scrollbar-thumb:hover { background-color: var(--sll-b-brand-hover); }
@supports not selector(::-webkit-scrollbar) {
  .sll-scroll { scrollbar-width: thin; scrollbar-color: var(--sll-b-brand) transparent; }
}
`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE;
  /** true = altura fixa de 90vh (como o Histórico); false = acompanha o conteúdo */
  tall?: boolean;
};

export function SllModal({ open, onOpenChange, title, children, footer, size = 'lg', tall = false }: Props) {
  // O Dialog renderiza em portal; copia a fonte real do app.
  const fontFamily = useMemo(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const el = document.getElementById('root') || document.body;
    return getComputedStyle(el).fontFamily;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ fontFamily }}
        className={cn(
          'flex w-full flex-col gap-0 overflow-hidden border-0 bg-white p-0 text-slate-800 shadow-2xl outline-none focus:outline-none focus-visible:outline-none sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100',
          SIZE[size],
          tall ? 'h-[90vh]' : 'max-h-[90vh]',
        )}
      >
        <style>{SCROLL_CSS}</style>
        <DialogHeader className="shrink-0 space-y-0 border-b border-slate-200 px-6 py-4 pr-14 text-left dark:border-slate-700">
          <DialogTitle className="text-xl font-extrabold leading-tight tracking-normal text-slate-800 dark:text-white">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="sll-scroll min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-5 dark:bg-slate-950">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const sllBtnPrimary =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[color:var(--sll-b-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--sll-b-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60';

export const sllBtnGhost =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--sll-b-brand)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';