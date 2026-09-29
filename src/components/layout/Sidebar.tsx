import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Settings, Video, LogOut, Gift, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const isExpanded = !isCollapsed;

  const menuItems = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Módulos', icon: Video, path: '/dashboard/modules' },
    { name: 'Assinatura', icon: ShoppingCart, path: '/dashboard/subscription' },
    { name: 'Indica & Ganha', icon: Gift, path: '/dashboard/afiliados' },
    { name: 'Configurações', icon: Settings, path: '/dashboard/settings' },
  ];

  return (
    <aside
      className={`h-screen fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Logo Area */}
      <div className="p-4 flex flex-col gap-3 h-24 justify-center border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-center items-center">
          {isExpanded ? (
            <span className="text-xl font-bold tracking-tight whitespace-nowrap">
              <span className="text-[#0094eb]">Loja</span>{' '}
              <span className="text-[#fd8539]">Lucrativa</span>
            </span>
          ) : (
            <span className="text-2xl font-black text-[#0094eb]">L</span>
          )}
        </div>
      </div>

      {/* Botão Recolher/Expandir */}
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

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {isExpanded && (
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Menu Principal
          </p>
        )}

        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              title={!isExpanded ? item.name : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                !isExpanded ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[#fd8539] text-white font-medium shadow-md shadow-[#fd8539]/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0094eb]'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {isExpanded && <span className="whitespace-nowrap">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => signOut()}
          title={!isExpanded ? 'Sair da Plataforma' : undefined}
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors ${
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
