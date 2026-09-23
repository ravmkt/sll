import React from 'react';
import { X, Sparkles, TrendingUp, Check } from 'lucide-react';

interface MarketStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  segmentName?: string;
}

export const MarketStudyModal: React.FC<MarketStudyModalProps> = ({
  isOpen,
  onClose,
  segmentName = 'Joias e Semijoias'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge Inteligência Setorial */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-800/60 text-[#0094eb] text-xs font-semibold tracking-wide mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#0094eb]" />
          <span>INTELIGÊNCIA SETORIAL 2026</span>
        </div>

        {/* Título e Subtítulo */}
        <h2 className="text-2xl md:text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight">
          Estudo de Mercado: {segmentName}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Métricas ideais compiladas do ecossistema de Social Commerce do varejo brasileiro.
        </p>

        {/* 3 Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
          {/* Card CTR */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              CTR MÉDIO (CLIQUES)
            </span>
            <div className="my-2 text-3xl font-extrabold text-[#0094eb]">
              3.9%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Taxa ideal de cliques no card de produto durante a exibição.
            </p>
          </div>

          {/* Card CVR */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              CVR MÉDIO (CONVERSÃO)
            </span>
            <div className="my-2 text-3xl font-extrabold text-emerald-500">
              1.9%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Taxa ideal de vendas pagas em relação às visualizações totais.
            </p>
          </div>

          {/* Card Hook Rate */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              HOOK RATE (FISGADA 3S)
            </span>
            <div className="my-2 text-3xl font-extrabold text-[#fd8539]">
              63.5%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Média de retenção de usuários nos primeiros 3s críticos do vídeo.
            </p>
          </div>
        </div>

        {/* Box Playbook de Ação */}
        <div className="p-5 md:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#0094eb]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0094eb]">
              PLAYBOOK DE AÇÃO PARA ALCANÇAR A META
            </h3>
          </div>

          {/* Comportamento do Consumidor */}
          <div className="mb-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              COMPORTAMENTO DO CONSUMIDOR:
            </h4>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Comportamento de varejo digital focado em dinamismo, gatilhos visuais e clareza imediata de proposta de valor.
            </p>
          </div>

          {/* Recomendações Práticas */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              RECOMENDAÇÕES PRÁTICAS (2026):
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-600 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800 dark:text-white font-semibold">Regra dos 3 Segundos:</strong> Apresente o benefício ou dor resolvida logo no início.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-600 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800 dark:text-white font-semibold">Legendas Sempre Ativas:</strong> Garanta que quem assiste sem som consiga comprar com facilidade.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-600 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800 dark:text-white font-semibold">CTA Direto:</strong> Indique claramente o card do produto logo abaixo do vídeo.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé / Disclaimer */}
        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 leading-relaxed max-w-xl mx-auto">
          * Estudo compilado em Janeiro/2026 a partir do cruzamento de pesquisas de mercado nacional e taxas empíricas de Social Video Commerce do varejo digital brasileiro B2C.
        </p>
      </div>
    </div>
  );
};

export default MarketStudyModal;
