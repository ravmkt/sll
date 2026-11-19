import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, Truck } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';

const BASE = '/dashboard/modules/gestor';

const ITEMS = [
  { to: BASE, label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: `${BASE}/produtos`, label: 'Produtos e estoque', icon: Package, end: false },
  { to: `${BASE}/fornecedores`, label: 'Fornecedores', icon: Truck, end: false },
  { to: ${BASE}/categorias, label: 'Categorias e marcas', icon: Tags, end: false },
];

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function GestorLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}>
      <TopBar />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b bg-white md:w-56 md:border-b-0 md:border-r">
          <p className="hidden px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 md:block">Gestor</p>
          <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col">
            {ITEMS.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={linkCls}>
                <i.icon className="h-4 w-4" /> {i.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}