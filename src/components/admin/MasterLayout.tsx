import type { ElementType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, LayoutDashboard, Lightbulb, Megaphone, ShieldCheck, Store, Tag } from 'lucide-react';

export type MasterTab = 'dashboard' | 'lojas' | 'modulos' | 'precos' | 'marketing' | 'insights';

const ITEMS: { id: MasterTab; label: string; icon: ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'lojas', label: 'Lojas', icon: Store },
  { id: 'modulos', label: 'Módulos', icon: Layers },
  { id: 'precos', label: 'Preços', icon: Tag },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

export function MasterLayout({ tab, onTab, children }: { tab: MasterTab; onTab: (t: MasterTab) => void; children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#0b0e1a] font-sans text-slate-200">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-[#0f1322]">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0094eb] to-[#fd8539]">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black leading-tight text-white">SLL Master</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">SuperAdmin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const on = tab === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onTab(it.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors ${
                  on ? 'bg-[#0094eb] font-semibold text-white shadow-md shadow-[#0094eb]/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} className="shrink-0" />
            Voltar ao SLL
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}

export default MasterLayout;