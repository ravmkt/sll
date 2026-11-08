import type { ReactNode } from 'react';
import { TopBar } from '@/components/layout/TopBar';

export default function BuilderEditorShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-800"
      style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}
    >
      <TopBar />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}