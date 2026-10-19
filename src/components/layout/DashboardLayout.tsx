import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoja } from '@/contexts/LojaContext';
import { AppFooter } from '@/components/layout/AppFooter';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import PortalHeader from '@/components/layout/PortalHeader';
import MarketingHost from '@/components/marketing/MarketingHost';
import { useTouchStoreActivity } from '@/hooks/useTouchStoreActivity';

const KEY = 'sll_sidebar_collapsed';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { storeId } = useLoja() as { storeId: string | null };
  useTouchStoreActivity();
  const mkLocation: 'vidlytics' | 'live' | 'home' = pathname.includes('vidlytics') ? 'vidlytics' : pathname.includes('live') ? 'live' : 'home';
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  const toggle = () => {
    setCollapsed((v) => {
      try { localStorage.setItem(KEY, v ? '0' : '1'); } catch { /* ignora */ }
      return !v;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}>
      <TopBar />
      <div className="flex flex-1">
        <Sidebar isCollapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto min-[1900px]:ml-0 w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="space-y-6">
              <PortalHeader />
              {children}
            </div>
          </main>
          <AppFooter />
        </div>
      </div>
      <MarketingHost storeId={storeId} location={mkLocation} showBanner={mkLocation !== 'home'} />
    </div>
  );
}

export default DashboardLayout;