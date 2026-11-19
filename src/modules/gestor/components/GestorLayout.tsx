import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3, FileText, LayoutDashboard, Package, PackageCheck, Percent, Plug, Receipt,
  RotateCcw, Settings, ShoppingBag, ShoppingCart, Tags, TrendingDown, TrendingUp, Truck,
  UserCog, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';

const BASE = '/dashboard/modules/gestor';

interface NavItem {
  label: string;
  icon: LucideIcon;
  path?: string;
  end?: boolean;
  soon?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: 'Geral',
    items: [{ label: 'Visão geral', icon: LayoutDashboard, path: '', end: true }],
  },
  {
    title: 'Cadastros',
    items: [
      { label: 'Produtos', icon: Package, path: 'produtos' },
      { label: 'Clientes', icon: Users, soon: true },
      { label: 'Fornecedores', icon: Truck, path: 'fornecedores' },
      { label: 'Vendedores', icon: UserCog, soon: true },
      { label: 'Categorias e marcas', icon: Tags, path: 'categorias' },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { label: 'Pedidos', icon: ShoppingCart, path: 'pedidos' },
      { label: 'Venda manual', icon: ShoppingBag, soon: true },
      { label: 'Propostas comerciais', icon: FileText, soon: true },
    ],
  },
  {
    title: 'Logística',
    items: [
      { label: 'Expedição', icon: PackageCheck, soon: true },
      { label: 'Logística reversa', icon: RotateCcw, soon: true },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Contas a pagar', icon: TrendingDown, soon: true },
      { label: 'Contas a receber', icon: TrendingUp, soon: true },
      { label: 'Comissões', icon: Percent, soon: true },
      { label: 'Caixa', icon: Wallet, soon: true },
    ],
  },
  {
    title: 'Fiscal',
    items: [{ label: 'Notas fiscais', icon: Receipt, soon: true }],
  },
  {
    title: 'Análise',
    items: [{ label: 'Relatórios', icon: BarChart3, soon: true }],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Configurações', icon: Settings, soon: true },
      { label: 'Integrações', icon: Plug, soon: true },
    ],
  },
];

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

const soonCls =
  'flex cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-400';

export default function GestorLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}>
      <TopBar />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b bg-white md:w-60 md:border-b-0 md:border-r">
          <nav className="flex gap-3 overflow-x-auto p-2 md:flex-col md:gap-4 md:overflow-visible md:p-3">
            {GROUPS.map((g) => (
              <div key={g.title} className="flex gap-1 md:flex-col">
                <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 md:block">{g.title}</p>
                {g.items.map((i) =>
                  i.soon || i.path === undefined ? (
                    <span key={i.label} className={soonCls} aria-disabled="true" title="Em breve">
                      <i.icon className="h-4 w-4" /> {i.label}
                      <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">em breve</span>
                    </span>
                  ) : (
                    <NavLink key={i.label} to={i.path ? `${BASE}/${i.path}` : BASE} end={i.end} className={linkCls}>
                      <i.icon className="h-4 w-4" /> {i.label}
                    </NavLink>
                  ),
                )}
              </div>
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