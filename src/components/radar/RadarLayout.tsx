import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';
import { RadarStoreProvider, useRadarCtx } from '@/hooks/radar/useRadarStore';
import { ErrorBox, Skeleton } from './RadarUI';
import { RadarSidebar } from './RadarSidebar';

const KEY = 'sll_radar_sidebar_collapsed';

function Shell() {
  const { store, loading, error } = useRadarCtx();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  const toggle = () =>
    setCollapsed((v) => {
      try { localStorage.setItem(KEY, v ? '0' : '1'); } catch { /* ignora */ }
      return !v;
    });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}>
      <TopBar />
      <div className="flex flex-1">
        <RadarSidebar isCollapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
            {loading && <Skeleton className="h-40 w-full" />}
            {error && <ErrorBox message={error} />}
            {store && <Outlet />}
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}

export default function RadarLayout() {
  return (
    <RadarStoreProvider>
      <Shell />
    </RadarStoreProvider>
  );
}