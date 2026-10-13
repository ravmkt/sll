import PortalHeader from '@/components/layout/PortalHeader';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoja } from '@/contexts/LojaContext';
import { AppFooter } from '@/components/layout/AppFooter';
import { TopBar } from '@/components/layout/TopBar';
import MarketingHost from '@/components/marketing/MarketingHost';


export function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { storeId } = useLoja() as { storeId: string | null };
  const mkLocation: 'vidlytics' | 'live' | 'home' = pathname.includes('vidlytics') ? 'vidlytics' : pathname.includes('live') ? 'live' : 'home';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'var(--trial-h, 0px)' }}>
      
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"><div className="space-y-6"><PortalHeader />{children}</div></main>
      <AppFooter />
      <MarketingHost storeId={storeId} location={mkLocation} showBanner={mkLocation !== 'home'} />
    </div>
  );
}

export default DashboardLayout;