import { useState } from 'react';
import type { ReactNode } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';
import { PromocoesSidebar } from './PromocoesSidebar';
import { PROMOCOES_ITEMS, type PromocoesTab } from './promocoesNav';

const KEY = 'sll_promocoes_sidebar_collapsed';

export default function PromocoesLayout({
  children, initialTab = 'studio',
}: { children: (tab: PromocoesTab) => ReactNode; initialTab?: PromocoesTab }) {
  const [tab, setTab] = useState<PromocoesTab>(initialTab);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  const toggle = () =>
    setCollapsed((v) => {
      try { localStorage.setItem(KEY, v ? '0' : '1'); } catch { /* ignora */ }
      return !v;
    });

  const current = PROMOCOES_ITEMS.find((i) => i.id === tab) ?? PROMOCOES_ITEMS[0];
  const Icon = current.icon;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}>
      <TopBar />
      <div className="flex flex-1">
        <PromocoesSidebar activeTab={tab} onTabChange={setTab} isCollapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
            <header className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]">
                <Icon size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900">{current.label}</h1>
                <p className="text-sm text-slate-500">{current.description}</p>
              </div>
            </header>
            {children(tab)}
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}