import React from 'react';
import {
  Radio,
  TrendingUp,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export type LiveTab = 'lives' | 'resultados' | 'aparencia';

interface LiveSidebarProps {
  activeTab: LiveTab;
  onTabChange: (tab: LiveTab) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function LiveSidebar({ activeTab, onTabChange, isCollapsed, onToggle }: LiveSidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isExpanded = !isCollapsed;

  const menuItems: { id: LiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'lives', label: 'Minhas Lives', icon: Radio },
    { id: 'resultados', label: 'Resultados & Métricas', icon: TrendingUp },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-4 flex flex-col gap-3 h-24 justify-center border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0094eb] to-[#fd8539] flex items-center justify-center shadow-sm shrink-0">
            <Radio size={20} className="text-white" />
          </div>
          {isExpanded && (
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Live Commerce
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-bold transition-all w-full ${
            isExpanded
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
              : 'bg-[#0094eb] text-white hover:bg-[#007bc4]'
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

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {isExpanded && (
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Live Commerce
          </p>
        )}
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                !isExpanded ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[#0094eb] text-white font-medium shadow-md shadow-[#0094eb]/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0094eb]'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {isExpanded && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          title={!isExpanded ? 'Voltar ao Dashboard SLL' : undefined}
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0094eb] transition-colors cursor-pointer ${
            !isExpanded ? 'justify-center' : ''
          }`}
        >
          <ArrowLeft size={20} className="shrink-0" />
          {isExpanded && <span className="whitespace-nowrap">Voltar ao SLL</span>}
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          title={!isExpanded ? 'Sair da Plataforma' : undefined}
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors cursor-pointer ${
            !isExpanded ? 'justify-center' : ''
          }`}
        >
          <LogOut size={20} className="shrink-0" />
          {isExpanded && <span>Sair da Plataforma</span>}
        </button>
      </div>
    </aside>
  );
}