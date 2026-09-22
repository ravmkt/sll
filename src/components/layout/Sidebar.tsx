import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Settings, Video, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const menuItems = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Módulos', icon: Video, path: '/dashboard/modules' },
    { name: 'Assinatura', icon: ShoppingCart, path: '/dashboard/subscription' },
    { name: 'Configurações', icon: Settings, path: '/dashboard/settings' },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] transition-colors duration-300 flex flex-col z-20">
      {/* Logo Area */}
      <div className="p-6 flex justify-center items-center h-24 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[#0094eb]">Loja</span>{' '}
          <span className="text-[#fd8539]">Lucrativa</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Menu Principal
        </p>

        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#fd8539] text-white font-medium shadow-md shadow-[#fd8539]/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0094eb]'
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut size={20} />
          <span>Sair da Plataforma</span>
        </button>
      </div>
    </aside>
  );
}
