import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code2, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SidebarTourSlot from '@/components/layout/SidebarTourSlot';

export type GateTab = 'campanhas' | 'instalacao';

const ITEMS: { id: GateTab; label: string; icon: ElementType }[] = [
  { id: 'campanhas', label: 'Campanhas', icon: ShieldCheck },
  { id: 'instalacao', label: 'Instalação', icon: Code2 },
];

export function GateSidebar({
  activeTab, onTabChange, isCollapsed, onToggle,
}: { activeTab: GateTab; onTabChange: (t: GateTab) => void; isCollapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const isExpanded = !isCollapsed;

  return (
    <aside
      className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 self-start border-r border-slate-200 bg-white transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex h-24 items-center justify-center gap-3 border-b border-slate-200 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10">
          <ShieldCheck className="h-6 w-6 text-[#0094eb]" />
        </div>
        {isExpanded && <span className="text-2xl font-extrabold tracking-tight text-slate-900">Gate</span>}
      </div>

      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={onToggle}
          title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            isExpanded ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#0094eb] text-white hover:bg-[#007bc4]'
          }`}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={16} className="shrink-0" />
          ) : (
            <>
              <PanelLeftClose size={16} className="shrink-0" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>

      <nav className="flex min-h-0 flex-col overflow-y-auto px-4 py-5 [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = activeTab === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onTabChange(it.id)}
                title={!isExpanded ? it.label : undefined}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-all duration-200 ${
                  !isExpanded ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-[#0094eb] font-medium text-white shadow-md shadow-[#0094eb]/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0094eb]'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                {isExpanded && <span className="whitespace-nowrap">{it.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto pb-4"><SidebarTourSlot isExpanded={isExpanded} /></div>

      <div className="space-y-2 border-t border-slate-200 px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          title={!isExpanded ? 'Voltar ao SLL' : undefined}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0094eb] ${
            !isExpanded ? 'justify-center' : 'justify-start'
          }`}
        >
          <ArrowLeft size={18} className="shrink-0" />
          {isExpanded && <span className="whitespace-nowrap">Voltar ao SLL</span>}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          title={!isExpanded ? 'Sair da Plataforma' : undefined}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 ${
            !isExpanded ? 'justify-center' : 'justify-start'
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {isExpanded && <span>Sair da Plataforma</span>}
        </button>
      </div>
    </aside>
  );
}

export default GateSidebar;