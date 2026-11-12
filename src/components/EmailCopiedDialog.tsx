import React from 'react';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';

interface EmailCopiedDialogProps {
  isOpen: boolean;
  email: string;
  copied: boolean;
  onClose: () => void;
}

const EmailCopiedDialog: React.FC<EmailCopiedDialogProps> = ({ isOpen, email, copied, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/40 dark:bg-black/60 flex items-center justify-center px-4 backdrop-blur-[2px] animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-[480px] bg-white dark:bg-[#111524] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#ff7a29]/30 overflow-hidden animate-scale-up flex flex-col transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-wider uppercase font-sans">
            {copied ? 'E-MAIL COPIADO' : 'E-MAIL DO CONTATO'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 dark:text-slate-500 hover:text-[#0091ff] dark:hover:text-[#ff7a29] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <div className={copied ? 'w-20 h-20 rounded-full border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/10 flex items-center justify-center' : 'w-20 h-20 rounded-full border border-amber-100 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/10 flex items-center justify-center'}>
            {copied ? <CheckCircle2 className="h-10 w-10 text-emerald-500" /> : <AlertTriangle className="h-10 w-10 text-amber-500" />}
          </div>
        </div>

        <div className={copied ? 'mb-8 p-4 bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl flex items-start gap-3' : 'mb-8 p-4 bg-[#FFFDF5] dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-2xl flex items-start gap-3'}>
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
          <p className={copied ? 'text-xs font-semibold text-emerald-950/90 dark:text-emerald-200/90 leading-relaxed text-left' : 'text-xs font-semibold text-amber-950/90 dark:text-amber-200/90 leading-relaxed text-left'}>
            {copied ? 'Nenhum programa de e-mail foi encontrado neste computador. O e-mail ' : 'Nenhum programa de e-mail foi encontrado e não foi possível copiar automaticamente. E-mail: '}
            <span className="text-[#0091ff] dark:text-[#ff7a29] font-extrabold">"{email}"</span>
            {copied ? ' foi copiado para a área de transferência.' : ''}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] text-xs font-extrabold text-white transition-all cursor-pointer text-center shadow-sm"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default EmailCopiedDialog;