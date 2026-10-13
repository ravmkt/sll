import React, { useEffect, useState } from 'react';
import { AppFooter } from '@/components/layout/AppFooter';
import { TopBar } from '@/components/layout/TopBar';
import MarketingBanner from '@/components/marketing/MarketingBanner';
import MarketingHost from '@/components/marketing/MarketingHost';
import { useLoja } from '@/contexts/LojaContext';
import AppToggle from '@/components/vidlytics/AppToggle';
import { VidlyticsSidebar, VidlyticsTab } from '../vidlytics/components/VidlyticsSidebar';
import VisaoGeralTab from '../vidlytics/tabs/VisaoGeralTab';
import ResultadosTab from '../vidlytics/tabs/ResultadosTab';
import StoriesTab from '../vidlytics/tabs/StoriesTab';
import BibliotecaTab from '../vidlytics/tabs/BibliotecaTab';
import ComentariosTab from '../vidlytics/tabs/ComentariosTab';
import AparenciaTab from '../vidlytics/tabs/AparenciaTab';

const TABS: VidlyticsTab[] = ['visao-geral', 'resultados', 'stories', 'biblioteca', 'comentarios', 'aparencia'];

export default function Vidlytics() {
  // Regra SLL: todo acesso ao modulo abre na Visao Geral (ignora URL e localStorage)
  const [activeTab, setActiveTab] = useState<VidlyticsTab>(() => {
    try { if (sessionStorage.getItem('sll_pending_tab') === 'comentarios') return 'comentarios'; } catch { /* segue */ }
    return 'visao-geral';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [, setMkBanner] = useState(false);
  const { storeId } = useLoja() as { storeId: string | null };

  useEffect(() => {
    localStorage.removeItem('sll_vidlytics_active_tab');
    try { sessionStorage.removeItem('sll_pending_tab'); } catch { /* ignora */ }
  }, []);

  useEffect(() => {
    const onGoto = (e: Event) => {
      const d: any = (e as CustomEvent).detail;
      const tab = typeof d === 'string' ? d : d?.tab;
      if (!TABS.includes(tab)) return;
      if (tab === 'resultados') {
        try { sessionStorage.setItem('vidlytics_results_sub', (d && typeof d === 'object' && d.sub) || 'insights'); } catch { /* ignora */ }
      }
      setActiveTab(tab as VidlyticsTab);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('vidlytics:goto-tab', onGoto);
    return () => window.removeEventListener('vidlytics:goto-tab', onGoto);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'var(--trial-h, 0px)' }}>
      <TopBar actions={<AppToggle />} />

      <div className="flex flex-1">
        <VidlyticsSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
            {activeTab === 'visao-geral' && <MarketingBanner storeId={storeId} location="vidlytics" onActive={setMkBanner} />}

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

      <MarketingHost storeId={storeId} location="vidlytics" showBanner={false} />
    </div>
  );
}