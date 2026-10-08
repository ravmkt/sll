import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

function ConfirmDialog({ opts, onResult }: { opts: ConfirmOptions; onResult: (ok: boolean) => void }) {
  const danger = opts.danger !== false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResult(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResult]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => onResult(false)}
      role="dialog"
      aria-modal="true"
      aria-label={opts.title}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-[#0f1322] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-rose-500/15 text-rose-300' : 'bg-sky-500/15 text-sky-300'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">{opts.title}</h3>
            {opts.message && <div className="text-xs leading-relaxed text-slate-400">{opts.message}</div>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => onResult(false)}
            className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            {opts.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => onResult(true)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold text-white ${danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-[#0094eb] hover:bg-sky-500'}`}
          >
            {opts.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const onResult = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }, []);

  const dialog = opts ? <ConfirmDialog opts={opts} onResult={onResult} /> : null;
  return { confirm, dialog };
}