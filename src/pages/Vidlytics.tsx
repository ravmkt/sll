import React, { useState } from 'react';
import { Sparkles, ChevronDown, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VidlyticsSidebar, VidlyticsTab } from './vidlytics/components/VidlyticsSidebar';
import VisaoGeralTab from './vidlytics/tabs/VisaoGeralTab';
import ResultadosTab from './vidlytics/tabs/ResultadosTab';
import StoriesTab from './vidlytics/tabs/StoriesTab';
import BibliotecaTab from './vidlytics/tabs/BibliotecaTab';
import ComentariosTab from './vidlytics/tabs/ComentariosTab';
import AparenciaTab from './vidlytics/tabs/AparenciaTab';

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VidlyticsTab>('visao-geral');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      {/* 1. SIDEBAR LATERAL PRÓPRIA DO VIDLYTICS */}
      <VidlyticsSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL COM SCROLL INDEPENDENTE */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* HEADER SUPERIOR */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Módulo Ativo
            </span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1 text-xs text-slate-700 font-medium">
              <Layers className="w-3.5 h-3.5 text-[#0094eb]" />
              <span><strong className="text-slate-800">Vidlytics Stories</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/modules')}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Hub Central SLL
            </button>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-6 space-y-6">
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

          {/* RENDERIZAÇÃO DAS ABAS NAVEGADAS PELA SIDEBAR */}
          {activeTab === 'visao-geral' && <VisaoGeralTab />}
          {activeTab === 'resultados' && <ResultadosTab />}
          {activeTab === 'stories' && <StoriesTab />}
          {activeTab === 'biblioteca' && <BibliotecaTab />}
          {activeTab === 'comentarios' && <ComentariosTab />}
          {activeTab === 'aparencia' && <AparenciaTab />}
        </main>

        {/* RODAPÉ SLL */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 Vidlytics. Todos os direitos reservados.</p>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">DESENVOLVIDO POR:</span>
              <img
                src="/assets/sll-logotipo.png"
                alt="Sistema Loja Lucrativa"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
