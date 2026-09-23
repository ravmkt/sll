import React, { useState } from 'react';
import { Sparkles, ChevronDown, Layers } from 'lucide-react';
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
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
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
            <span className="inline-flex items-center gap-1.5 bg-[#fd8539] text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3 h-3" /> TURBINE SEU E-COMMERCE
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Transforme visitantes em clientes com Vídeos Curtos e Stories
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Seus produtos integrados diretamente nos vídeos interativos com conversão em tempo real.
            </p>
          </div>

          {/* Gráfico decorativo do banner */}
          <div className="hidden lg:flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 w-60 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
              <span>USERS: LAST 7 DAYS</span>
              <span className="text-emerald-400 font-semibold">+57.1%</span>
            </div>
            <div className="flex items-end gap-1.5 h-10 pt-2">
              <div className="flex-1 bg-[#0094eb]/40 rounded-t h-4"></div>
              <div className="flex-1 bg-[#0094eb]/60 rounded-t h-6"></div>
              <div className="flex-1 bg-[#0094eb]/40 rounded-t h-5"></div>
              <div className="flex-1 bg-[#0094eb]/80 rounded-t h-9"></div>
              <div className="flex-1 bg-[#0094eb]/90 rounded-t h-7"></div>
              <div className="flex-1 bg-[#0094eb] rounded-t h-10 shadow-[0_0_8px_rgba(0,148,235,0.4)]"></div>
              <div className="flex-1 bg-[#0094eb]/70 rounded-t h-8"></div>
              <div className="flex-1 bg-[#0094eb]/85 rounded-t h-9"></div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS COM O LOGOTIPO VIDLYTICS AUMENTADO */}
        <div className="bg-white px-6 py-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img
              src="/assets/vidlytics-logo-wide.png"
              alt="Vidlytics"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
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
        </div>

        {/* RENDERIZAÇÃO MODULAR DAS ABAS */}
        {activeTab === 'visao-geral' && <VisaoGeralTab />}
        {activeTab === 'resultados' && <ResultadosTab />}
        {activeTab === 'stories' && <StoriesTab />}
        {activeTab === 'biblioteca' && <BibliotecaTab />}
        {activeTab === 'comentarios' && <ComentariosTab />}
        {activeTab === 'aparencia' && <AparenciaTab />}
      </main>

      {/* RODAPÉ COM LOGOTIPO SLL AUMENTADO */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Vidlytics. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">DESENVOLVIDO POR:</span>
            <img
              src="/assets/sll-logotipo.png"
              alt="Sistema Loja Lucrativa"
              className="h-9 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
