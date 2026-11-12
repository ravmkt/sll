import { useState } from 'react';
import type { ReactNode } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import AppToggle from '@/components/vidlytics/AppToggle';
import { AppFooter } from '@/components/layout/AppFooter';
import { BuilderSidebar } from '@/modules/builder/components/BuilderSidebar';

const KEY_LIST = 'sll_builder_list_sidebar_collapsed';
const KEY_EDITOR = 'sll_builder_editor_sidebar_collapsed';

export default function BuilderLayout({ children, editor = false }: { children: ReactNode; editor?: boolean }) {
  const KEY = editor ? KEY_EDITOR : KEY_LIST;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v === null ? editor : v === '1';
    } catch { return editor; }
  });

  const toggle = () =>
    setCollapsed((v) => {
      try { localStorage.setItem(KEY, v ? '0' : '1'); } catch { /* ignora */ }
      return !v;
    });

  const pad = { paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' };
  const bar = <TopBar actions={<AppToggle moduleKey="builder" />} />;

  if (editor) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-800" style={pad}>
        {bar}
        <div className="flex min-h-0 flex-1">
          <BuilderSidebar isCollapsed={collapsed} onToggle={toggle} />
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={pad}>
      {bar}
      <div className="flex flex-1">
        <BuilderSidebar isCollapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[76rem] space-y-6">{children}</div>
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}