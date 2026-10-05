import { AppFooter } from '@/components/layout/AppFooter';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { StoreBrand } from '../../components/layout/StoreBrand';
import { VidlyticsSidebar, VidlyticsTab } from '../vidlytics/components/VidlyticsSidebar';
import { ModuleSwitcher } from '../../components/layout/ModuleSwitcher';
import VisaoGeralTab from '../vidlytics/tabs/VisaoGeralTab';
import ResultadosTab from '../vidlytics/tabs/ResultadosTab';
import StoriesTab from '../vidlytics/tabs/StoriesTab';
import BibliotecaTab from '../vidlytics/tabs/BibliotecaTab';
import ComentariosTab from '../vidlytics/tabs/ComentariosTab';
import AparenciaTab from '../vidlytics/tabs/AparenciaTab';

export default function Vidlytics() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Obter aba inicial da URL, LocalStorage ou padrão 'visao-geral'
  const getInitialTab = (): VidlyticsTab => {
    const tabParam = searchParams.get('tab') as VidlyticsTab;
    const validTabs: VidlyticsTab[] = ['visao-geral', 'resultados', 'stories', 'biblioteca', 'comentarios', 'aparencia'];
    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }
    const saved = localStorage.getItem('sll_vidlytics_active_tab') as VidlyticsTab;
    if (saved && validTabs.includes(saved)) {
      return saved;
    }
    return 'visao-geral';
  };

  const [activeTab, setActiveTab] = useState<VidlyticsTab>(getInitialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mudar aba persistindo na URL e no LocalStorage
  const handleTabChange = (newTab: VidlyticsTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
    localStorage.setItem('sll_vidlytics_active_tab', newTab);
  };

  // Escutar caso a URL mude
  useEffect(() => {
    const tabParam = searchParams.get('tab') as VidlyticsTab;
    const validTabs: VidlyticsTab[] = ['visao-geral', 'resultados', 'stories', 'biblioteca', 'comentarios', 'aparencia'];
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
      localStorage.setItem('sll_vidlytics_active_tab', tabParam);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      {/* 1. SIDEBAR LATERAL VIDLYTICS */}
      <VidlyticsSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TOPBAR LIMPA: SELETOR DE MÓDULOS ALINHADO À DIREITA */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-2.5 flex items-center justify-between sticky top-0 z-20">
          <StoreBrand />
          <ModuleSwitcher />
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-6 space-y-6">
          {/* BANNER PROMO - EXCLUSIVO DA VISÃO GERAL */}
          {activeTab === 'visao-geral' && (
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
          )}

          {/* RENDERIZAÇÃO DAS ABAS NAVEGADAS PELA SIDEBAR */}
          {activeTab === 'visao-geral' && <VisaoGeralTab />}
          {activeTab === 'resultados' && <ResultadosTab />}
          {activeTab === 'stories' && <StoriesTab />}
          {activeTab === 'biblioteca' && <BibliotecaTab />}
          {activeTab === 'comentarios' && <ComentariosTab />}
          {activeTab === 'aparencia' && <AparenciaTab />}
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
