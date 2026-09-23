import React, { useState } from 'react';
import { Sparkles, ChevronDown, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VisaoGeralTab from './vidlytics/tabs/VisaoGeralTab';
import ResultadosTab from './vidlytics/tabs/ResultadosTab';
import StoriesTab from './vidlytics/tabs/StoriesTab';
import BibliotecaTab from '../components/vidlytics/BibliotecaTab';
import ComentariosTab from './vidlytics/tabs/ComentariosTab';

export type VidlyticsTab = 'visao-geral' | 'resultados' | 'stories' | 'biblioteca' | 'produtos' | 'comentarios' | 'aparencia';

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VidlyticsTab>('visao-geral');

  const tabs: { id: VidlyticsTab; label: string }[] = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'stories', label: 'Stories' },
    { id: 'biblioteca', label: 'Biblioteca' },
    { id: 'produtos', label: 'Produtos' },
    { id: 'comentarios', label: 'Comentários' },
    { id: 'aparencia', label: 'Aparência' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 1. TOPBAR DO SLL */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <img
            src="/assets/sll-logotipo-ico.png"
            alt="SLL"
            className="h-8 w-auto object-contain"
          />
          <span className="text-slate-500 font-normal">←</span>
          <span>Voltar ao Hub Central</span>
        </button>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-medium shadow-2xs hover:bg-slate-100/70 transition-colors cursor-pointer">
          <Layers className="w-3.5 h-3.5 text-[#0094eb]" />
          <span>Módulo: <strong className="text-slate-800">Vidlytics Stories</strong></span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* BANNER PROMO */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl z-10">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#fd8539] to-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3 h-3" /> Turbine seu E-commerce
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Transforme visitantes em clientes com Vídeos Curtos e Stories
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Exiba reels e stories engajadores na sua loja com compra direta com um clique.
            </p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0094eb] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* RENDERIZAÇÃO MODULAR DAS ABAS */}
        {activeTab === 'visao-geral' && <VisaoGeralTab />}
        {activeTab === 'resultados' && <ResultadosTab />}
        {activeTab === 'stories' && <StoriesTab />}
        {activeTab === 'biblioteca' && <BibliotecaTab />}
        {activeTab === 'comentarios' && <ComentariosTab />}

        {/* Placeholder para abas pendentes (Produtos e Aparência) */}
        {!['visao-geral', 'resultados', 'stories', 'biblioteca', 'comentarios'].includes(activeTab) && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <h3 className="text-base font-bold text-slate-700 capitalize">Módulo: {activeTab}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Esta aba terá seu próprio arquivo isolado em <code>src/pages/vidlytics/tabs/</code>.
            </p>
          </div>
        )}
      </main>

      {/* Rodapé SLL Padrão */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Sistema Loja Lucrativa. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Termos de Uso</span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Privacidade</span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Suporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

