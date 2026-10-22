import React from 'react';
import { Radio,
  LayoutDashboard,
  TrendingUp,
  Users,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SidebarTourSlot from '@/components/layout/SidebarTourSlot';
import { useAuth } from '@/contexts/AuthContext';

export type LiveTab =
  | 'visao-geral'
  | 'resultados'
  | 'lives'
  | 'audiencia'
  | 'comentarios'
  | 'aparencia'
  | 'treinamento';

interface LiveSidebarProps {
  activeTab: LiveTab;
  onTabChange: (tab: LiveTab) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const MENU_ITEMS: { id: LiveTab; label: string; icon: React.ElementType }[] = [
  { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'resultados', label: 'Resultados & Métricas', icon: TrendingUp },
  { id: 'lives', label: 'Lives', icon: Radio },
  { id: 'audiencia', label: 'Audiência', icon: Users },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
];

export function LiveSidebar({ activeTab, onTabChange, isCollapsed, onToggle }: LiveSidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isExpanded = !isCollapsed;

  return (
    <aside
      className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 self-start border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] transition-all duration-300 ease-in-out flex flex-col z-30 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-4 flex flex-col gap-3 h-24 justify-center border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-center items-center">
          {isExpanded ? (
            <img src="/assets/stream-sell-logo-wide.png" alt="Stream Sell" className="h-14 w-auto max-w-full object-contain" />
          ) : (
            <img src="/assets/stream-sell-logo-ico.png" alt="Stream Sell" className="h-11 w-11 object-contain" />
          )}
        </div>
      </div>

      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-bold transition-all w-full cursor-pointer ${
            isExpanded
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
              : 'bg-[#e11d48] text-white hover:bg-[#be123c]'
          }`}
          title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
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

      <nav className="flex min-h-0 flex-col px-4 py-5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-1">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                  !isExpanded ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-[#e11d48] text-white font-medium shadow-md shadow-[#e11d48]/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#e11d48]'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                {isExpanded && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="mt-auto pb-4"><SidebarTourSlot isExpanded={isExpanded} /></div>

      <div className="px-4 pt-3 pb-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          title={!isExpanded ? 'Voltar ao Dashboard SLL' : undefined}
          className={`flex items-center gap-2.5 px-4 py-2 w-full rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#e11d48] transition-colors cursor-pointer ${
            !isExpanded ? 'justify-center' : 'justify-start'
          }`}
        >
          <ArrowLeft size={18} className="shrink-0" />
          {isExpanded && <span className="whitespace-nowrap">Voltar ao SLL</span>}
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          title={!isExpanded ? 'Sair da Plataforma' : undefined}
          className={`flex items-center gap-2.5 px-4 py-2 w-full rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors cursor-pointer ${
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