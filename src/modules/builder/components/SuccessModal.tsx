import { useEffect } from 'react';
import { CircleCheck, ExternalLink } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  href?: string;
}

export default function SuccessModal({ open, title, message, onClose, href }: Props) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl"
      >
        <CircleCheck className="mx-auto h-16 w-16 text-emerald-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <ExternalLink className="h-4 w-4" /> Abrir p&aacute;gina
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#0094eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#007bc4]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}