import { useState } from 'react';
import type { ReactNode } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';
import { GateSidebar, type GateTab } from './GateSidebar';

const KEY = 'sll_gate_sidebar_collapsed';

export default function GateLayout({ children }: { children: (tab: GateTab) => ReactNode }) {
  const [tab, setTab] = useState<GateTab>('campanhas');
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
        <GateSidebar activeTab={tab} onTabChange={setTab} isCollapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">{children(tab)}</main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}