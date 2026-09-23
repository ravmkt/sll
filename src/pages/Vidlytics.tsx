import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VisaoGeralTab from './vidlytics/tabs/VisaoGeralTab';
import ResultadosTab from './vidlytics/tabs/ResultadosTab';
import StoriesTab from './vidlytics/tabs/StoriesTab';
import BibliotecaTab from '../components/vidlytics/BibliotecaTab';
import ComentariosTab from './vidlytics/tabs/ComentariosTab';
import AparenciaTab from './vidlytics/AparenciaTab';

export type VidlyticsTab = 'visao-geral' | 'resultados' | 'stories' | 'biblioteca' | 'comentarios' | 'aparencia';

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VidlyticsTab>('stories');

  const tabs: { id: VidlyticsTab; label: string }[] = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'stories', label: 'Stories' },
    { id: 'biblioteca', label: 'Biblioteca' },
    { id: 'comentarios', label: 'Comentários' },
    { id: 'aparencia', label: 'Aparência' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Topbar com navegação do SLL Hub e Card de Abas */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40 gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
        >
          <img
            src="/assets/sll-logotipo-ico.png"
            alt="SLL"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-slate-500 font-normal">←</span>
          <span>Voltar ao Hub Central</span>
        </button>

        {/* Card de abas com o logotipo oficial à esquerda */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs w-full max-w-4xl">
          {/* Logotipo Vidlytics oficial */}
          <div className="flex items-center pr-4">
            <img
              src="/assets/vidlytics-logo-wide.png"
              alt="Vidlytics"
              className="h-7 w-auto object-contain"
            />
          </div>

          {/* Abas */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0094eb] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Conteúdo dinâmico das Abas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'visao-geral' && <VisaoGeralTab />}
        {activeTab === 'resultados' && <ResultadosTab />}
        {activeTab === 'stories' && <StoriesTab />}
        {activeTab === 'biblioteca' && <BibliotecaTab />}
        {activeTab === 'comentarios' && <ComentariosTab />}
        {activeTab === 'aparencia' && <AparenciaTab />}
      </main>

      {/* Rodapé Padronizado SLL */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs tracking-wider text-slate-500">© 2026 Vidlytics</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">DESENVOLVIDO POR:</span>
          <img
            src="/assets/sll-logotipo.png"
            alt="Sistema Loja Lucrativa"
            className="h-6 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </footer>
    </div>
  );
}
