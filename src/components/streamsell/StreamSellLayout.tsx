import { TopBar } from "@/components/layout/TopBar";
import AppToggle from "@/components/vidlytics/AppToggle";
import { LiveSidebar, LiveTab } from "@/components/live/LiveSidebar";
import { AppFooter } from "@/components/layout/AppFooter";
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StreamSellLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const onTabChange = (tab: LiveTab) => {
    navigate('/dashboard/modules/stream-sell', {
      state: tab === 'aparencia' ? { tab: 'lives', openAppearance: true } : { tab },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'var(--trial-h, 0px)' }}>
      <TopBar actions={<AppToggle moduleKey="live_commerce" />} />
      <div className="flex flex-1">
        <LiveSidebar
          activeTab="lives"
          isCollapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          onTabChange={onTabChange}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}