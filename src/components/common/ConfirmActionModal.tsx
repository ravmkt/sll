import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * PADRAO OFICIAL de confirmacao do SLL (aprovado pelo Rodrigo).
 * Use este componente no lugar de window.confirm. Nao altere o visual.
 */
interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={isLoading ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle size={30} className="text-amber-500" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black tracking-wide text-slate-800 dark:text-white mb-2 uppercase">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-7">{description}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-5 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-5 py-3 rounded-xl text-sm font-extrabold text-white bg-[#0094eb] hover:bg-[#0082d0] shadow-lg shadow-[#0094eb]/30 cursor-pointer transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmActionModal;