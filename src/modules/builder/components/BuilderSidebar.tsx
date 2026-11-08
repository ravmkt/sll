import type { ElementType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, LayoutTemplate, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SidebarTourSlot from '@/components/layout/SidebarTourSlot';

const LOGO_WIDE = '/assets/builder-logo-wide.png';
const LOGO_ICO = '/assets/builder-sell-logo-ico.png';

type Item = { name: string; icon: ElementType; path: string; exact?: boolean };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: 'Builder',
    items: [
      { name: 'Minhas páginas', icon: LayoutTemplate, path: '/dashboard/modules/builder' },
    ],
  },
  {
    title: 'SLL Hub',
    items: [
      { name: 'Voltar ao Hub', icon: ArrowLeft, path: '/dashboard', exact: true },
    ],
  },
];

export function BuilderSidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const isExpanded = !isCollapsed;

  const isActive = (it: Item) =>
    it.exact ? pathname === it.path : pathname === it.path || pathname.startsWith(it.path + '/');

  const renderItem = (it: Item) => {
    const Icon = it.icon;
    const active = it.path !== '/dashboard' && isActive(it);
    return (
      <Link
        key={it.name}
        to={it.path}
        title={!isExpanded ? it.name : undefined}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
          !isExpanded ? 'justify-center' : ''
        } ${
          active
            ? 'bg-[#0094eb] text-white font-medium shadow-md shadow-[#0094eb]/20'
            : 'text-slate-600 hover:bg-slate-100 hover:text-[#0094eb]'
        }`}
      >
        <Icon size={20} className="shrink-0" />
        {isExpanded && <span className="whitespace-nowrap">{it.name}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 self-start border-r border-slate-200 bg-white transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-4 flex h-24 flex-col items-center justify-center border-b border-slate-200">
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
        {GROUPS.map((g, idx) => (
          <div key={g.title} className={idx > 0 ? 'mt-5' : ''}>
            {isExpanded ? (
              <p className="mb-1.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-900">{g.title}</p>
            ) : (
              idx > 0 && <div className="mx-3 mb-2 border-t border-slate-200" />
            )}
            <div className="flex flex-col gap-1">{g.items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      <SidebarTourSlot isExpanded={isExpanded} />

      <div className="border-t border-slate-200 px-4 pb-4 pt-3">
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