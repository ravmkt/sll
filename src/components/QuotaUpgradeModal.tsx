import { AlertTriangle, X } from 'lucide-react';
import type { QuotaState } from '@/services/quotaService';

type Props = {
  state: QuotaState | null;
  onClose: () => void;
  onUpgrade?: () => void;
  onAddon?: () => void;
  onManage?: () => void;
};

const gb = (b: number) => (b / 1073741824).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function texts(q: QuotaState): { title: string; text: string } {
  if (q.reason === 'module_inactive') {
    return {
      title: 'Acesso suspenso',
      text: 'Há uma pendência de pagamento ou a assinatura deste módulo não está ativa. Regularize para voltar a publicar.',
    };
  }
  if (q.kind === 'storage') {
    return {
      title: 'Seu armazenamento está cheio',
      text: `Você usou ${gb(q.used)} GB de ${gb(q.limit ?? 0)} GB do seu plano. Libere espaço ou aumente o limite para continuar enviando vídeos.`,
    };
  }
  return {
    title: `Você atingiu o limite de ${q.limit ?? ''} vídeos do seu plano`,
    text: 'Para continuar publicando, faça upgrade, contrate um add-on ou apague algum vídeo que não esteja mais usando.',
  };
}

export default function QuotaUpgradeModal({ state, onClose, onUpgrade, onAddon, onManage }: Props) {
  if (!state) return null;
  const { title, text } = texts(state);
  const suspended = state.reason === 'module_inactive';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111524] p-6 text-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Fechar">
          <X size={18} />
        </button>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fd8539]/15">
          <AlertTriangle className="h-5 w-5 text-[#fd8539]" />
        </div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{text}</p>

        <div className="mt-5 space-y-2">
          {onUpgrade && (
            <button type="button" onClick={onUpgrade} className="w-full cursor-pointer rounded-lg bg-[#fd8539] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
              {suspended ? 'Regularizar assinatura' : 'Fazer upgrade de plano'}
            </button>
          )}
          {onAddon && !suspended && (
            <button type="button" onClick={onAddon} className="w-full cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
              Comprar add-on
            </button>
          )}
          {onManage && !suspended && (
            <button type="button" onClick={onManage} className="w-full cursor-pointer rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5">
              Gerenciar meus vídeos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}