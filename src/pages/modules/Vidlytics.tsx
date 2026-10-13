import { useEffect as useEffectGoto } from 'react';
import { AppFooter } from '@/components/layout/AppFooter';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import MarketingBanner from '@/components/marketing/MarketingBanner';
import MarketingHost from '@/components/marketing/MarketingHost';
import { useLoja as useLojaMk } from '@/contexts/LojaContext';
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
  // Regra SLL: todo acesso ao modulo abre na Visao Geral (ignora URL e localStorage)
  const [activeTab, setActiveTab] = useState<VidlyticsTab>(() => {
    try { if (sessionStorage.getItem('sll_pending_tab') === 'comentarios') return 'comentarios'; } catch {}
    return 'visao-geral';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [, setMkBanner] = useState(false);
  const mkCtx: any = useLojaMk();
  const mkStoreId: string | null = mkCtx?.loja?.id ?? mkCtx?.store?.id ?? mkCtx?.storeId ?? mkCtx?.lojaId ?? null;

  useEffect(() => {
    localStorage.removeItem('sll_vidlytics_active_tab');
    try { sessionStorage.removeItem('sll_pending_tab'); } catch {}
  }, []);

  useEffectGoto(() => {
    const onGoto = (e: Event) => {
      const d: any = (e as CustomEvent).detail;
      const tab = typeof d === 'string' ? d : d?.tab;
      const valid = ['visao-geral', 'resultados', 'stories', 'biblioteca', 'comentarios', 'aparencia'];
      if (!valid.includes(tab)) return;
      if (tab === 'resultados') {
        try { sessionStorage.setItem('vidlytics_results_sub', (d && typeof d === 'object' && d.sub) || 'insights'); } catch {}
      }
      handleTabChange(tab as VidlyticsTab);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('vidlytics:goto-tab', onGoto);
    return () => window.removeEventListener('vidlytics:goto-tab', onGoto);
  });

  const handleTabChange = (newTab: VidlyticsTab) => {
    setActiveTab(newTab);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      {/* 1. SIDEBAR LATERAL VIDLYTICS */}
      <VidlyticsSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <MarketingHost storeId={mkStoreId} location="vidlytics" showBanner={false} />
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
          {activeTab === 'visao-geral' && <MarketingBanner storeId={mkStoreId} location="vidlytics" onActive={setMkBanner} />}
          

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
