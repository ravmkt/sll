import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "EXCLUIR ARQUIVO",
  itemName,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-7 pt-6 pb-2">
          <h3 className="font-extrabold text-slate-900 text-sm tracking-wider uppercase">
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com ícone circular de aviso e caixa âmbar */}
        <div className="px-7 py-5 flex flex-col items-center">
          {/* Círculo central com ícone de alerta */}
          <div className="w-20 h-20 rounded-full border border-amber-200/80 bg-amber-50/40 flex items-center justify-center mb-5">
            <AlertTriangle className="w-9 h-9 text-amber-500 stroke-[1.75]" />
          </div>

          {/* Banner de aviso âmbar idêntico ao Print 5 */}
          <div className="w-full bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Esta ação é irreversível. O item{" "}
              <strong className="text-amber-950 font-bold">"{itemName}"</strong>{" "}
              será removido permanentemente.
            </p>
          </div>
        </div>

        {/* Rodapé com Botões */}
        <div className="px-7 pb-6 pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-5 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-5 bg-[#0088ff] hover:bg-[#0077e6] text-white rounded-2xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm shadow-sky-200"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
