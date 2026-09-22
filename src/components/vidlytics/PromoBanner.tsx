import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

interface PromoBannerProps {
  onActionClick?: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ onActionClick }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0094eb] to-[#0070b8] p-5 text-white shadow-md transition-all hover:shadow-lg mb-6">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Novidade SLL
              </span>
              <span className="text-xs text-blue-100">Cross-sell & IA</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Maximize suas conversões com o Assistente de Conteúdo IA
            </h3>
            <p className="text-xs md:text-sm text-blue-100 mt-0.5">
              Gere roteiros persuasivos e sincronize produtos direto nas vitrines de vídeos.
            </p>
          </div>
        </div>

        <button
          onClick={onActionClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#fd8539] hover:bg-[#e07129] text-white font-medium text-xs md:text-sm rounded-xl shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
        >
          <span>Conhecer Módulo</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Detalhes visuais de fundo */}
      <div className="absolute -right-6 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-40 -top-10 w-32 h-32 bg-[#fd8539]/20 rounded-full blur-xl pointer-events-none" />
    </div>
  );
};

export default PromoBanner;
