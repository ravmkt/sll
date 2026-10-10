import { AppFooter } from '@/components/layout/AppFooter';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { StoreBrand } from './StoreBrand';
import { ModuleSwitcher } from './ModuleSwitcher';
import { MasterButton } from '@/components/admin/MasterButton';
import MarketingHost from '@/components/marketing/MarketingHost';
import { useLoja } from '@/contexts/LojaContext';
import { useLocation } from 'react-router-dom';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [isDark] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const ctx: any = useLoja();
  const { pathname } = useLocation();
  const mkStoreId: string | null = ctx?.loja?.id ?? ctx?.store?.id ?? ctx?.storeId ?? ctx?.lojaId ?? null;
  const mkLocation = pathname.includes('vidlytics') ? 'vidlytics' : pathname.includes('live') ? 'live' : 'home';

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed((v) => !v)} />

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <header className="h-16 bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 sticky z-20" style={{ top: 'var(--trial-h, 0px)' }}>
          <StoreBrand />
          <div className="flex items-center gap-2"><MasterButton /><ModuleSwitcher /></div>
        </header>

        {/* Dynamic Content */}
        <div className="p-8 flex-1">
          {children}
        </div>
      <AppFooter />
      </main>
      <MarketingHost storeId={mkStoreId} location={mkLocation} showBanner={mkLocation !== 'home'} />
    </div>
  );
}
