import { LayoutDashboard, LayoutGrid } from 'lucide-react';
import type { ElementType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutTemplate, Users, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SidebarTourSlot from '@/components/layout/SidebarTourSlot';

const LOGO_WIDE = '/assets/builder-logo-wide.png';
const LOGO_ICO = '/assets/builder-sell-logo-ico.png';

type Item = { name: string; icon: ElementType; path: string; end: boolean };

const ITEMS: Item[] = [
  { name: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard/modules/builder', end: true },
  { name: 'Minhas páginas', icon: LayoutTemplate, path: '/dashboard/modules/builder/paginas', end: false },
  { name: 'Templates', icon: LayoutGrid, path: '/dashboard/modules/builder/templates', end: false },
  { name: 'Leads', icon: Users, path: '/dashboard/leads', end: false },
];

export function BuilderSidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const isExpanded = !isCollapsed;

  return (
    <aside
      className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 self-start border-r border-slate-200 bg-white transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex h-24 flex-col items-center justify-center border-b border-slate-200 p-4">
        {isExpanded ? (
          <img src={LOGO_WIDE} alt="Builder" className="h-14 w-auto max-w-full object-contain" />
        ) : (
          <img src={LOGO_ICO} alt="Builder" className="h-11 w-11 object-contain" />
        )}
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
          {ITEMS.map(({ name, icon: Icon, path, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              title={!isExpanded ? name : undefined}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-200 ${
                  !isExpanded ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-[#0094eb] font-medium text-white shadow-md shadow-[#0094eb]/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0094eb]'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              {isExpanded && <span className="whitespace-nowrap">{name}</span>}
            </NavLink>
          ))}
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

export default BuilderSidebar;