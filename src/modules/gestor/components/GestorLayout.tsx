import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, ChevronDown, FolderOpen, LayoutDashboard, LogOut, PanelLeftClose,
  PanelLeftOpen, Plug, Settings, ShoppingCart, TrendingUp, Truck, Wallet,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';
import SidebarTourSlot from '@/components/layout/SidebarTourSlot';
import { useAuth } from '@/contexts/AuthContext';

const BASE = '/dashboard/modules/gestor';
const KEY = 'sll_gestor_sidebar_collapsed';

// Item sem "to" = em breve (desativado)
type Leaf = { label: string; to?: string };
type Group = { key: string; label: string; icon: ElementType; to?: string; items?: Leaf[] };

const GROUPS: Group[] = [
  { key: 'geral', label: 'Visão geral', icon: LayoutDashboard, to: BASE },
  {
    key: 'cadastros', label: 'Cadastros', icon: FolderOpen,
    items: [
      { label: 'Produtos', to: `${BASE}/produtos` },
      { label: 'Categorias e marcas', to: `${BASE}/categorias` },
      { label: 'Clientes' },
      { label: 'Fornecedores', to: `${BASE}/fornecedores` },
      { label: 'Vendedores' },
    ],
  },
  {
    key: 'vendas', label: 'Vendas', icon: ShoppingCart,
    items: [
      { label: 'Pedidos de vendas', to: `${BASE}/pedidos` },
      { label: 'Notas Fiscais' },
      { label: 'Propostas Comerciais' },
    ],
  },
  {
    key: 'logistica', label: 'Logística', icon: Truck,
    items: [{ label: 'Expedição' }, { label: 'Logística reversa' }],
  },
  {
    key: 'financeiro', label: 'Financeiro', icon: Wallet,
    items: [
      { label: 'Contas a pagar' },
      { label: 'Contas a receber' },
      { label: 'Comissões' },
      { label: 'Controle de caixa' },
      { label: 'Contabilidade' },
    ],
  },
  { key: 'relatorios', label: 'Relatórios', icon: TrendingUp },
  { key: 'config', label: 'Configurações', icon: Settings, items: [{ label: 'Empresa' }] },
  { key: 'integracoes', label: 'Integrações', icon: Plug },
];

const Soon = () => (
  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">em breve</span>
);

export default function GestorLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v === null ? window.innerWidth < 768 : v === '1';
    } catch { return false; }
  });
  const isExpanded = !collapsed;

  const setCollapsedSaved = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignora */ }
  };

  const isOn = (to: string) =>
    to === BASE ? pathname === BASE : pathname === to || pathname.startsWith(to + '/');

  const activeKey = GROUPS.find((g) => (g.to ? isOn(g.to) : g.items?.some((i) => i.to && isOn(i.to))))?.key ?? null;

  const [open, setOpen] = useState<string | null>(activeKey);
  useEffect(() => { if (activeKey) setOpen(activeKey); }, [activeKey]);

  const rowBase = 'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-200';
  const rowOn = 'bg-[#0094eb] font-medium text-white shadow-md shadow-[#0094eb]/20';
  const rowOff = 'text-slate-600 hover:bg-slate-100 hover:text-[#0094eb]';
  const rowSoon = 'cursor-not-allowed text-slate-400';

  const renderGroup = (g: Group) => {
    const Icon = g.icon;
    const isSingle = !g.items;
    const groupActive = activeKey === g.key;

    // Recolhido: só ícones
    if (!isExpanded) {
      if (isSingle && g.to) {
        return (
          <Link key={g.key} to={g.to} title={g.label} className={`${rowBase} justify-center ${isOn(g.to) ? rowOn : rowOff}`}>
            <Icon size={20} className="shrink-0" />
          </Link>
        );
      }
      if (isSingle) {
        return (
          <div key={g.key} title={`${g.label} (em breve)`} className={`${rowBase} justify-center ${rowSoon}`}>
            <Icon size={20} className="shrink-0" />
          </div>
        );
      }
      return (
        <button
          key={g.key}
          type="button"
          title={g.label}
          onClick={() => { setCollapsedSaved(false); setOpen(g.key); }}
          className={`${rowBase} cursor-pointer justify-center ${groupActive ? 'text-[#0094eb] bg-[#0094eb]/10' : rowOff}`}
        >
          <Icon size={20} className="shrink-0" />
        </button>
      );
    }

    // Expandido: item único
    if (isSingle) {
      if (g.to) {
        return (
          <Link key={g.key} to={g.to} className={`${rowBase} ${isOn(g.to) ? rowOn : rowOff}`}>
            <Icon size={20} className="shrink-0" />
            <span className="whitespace-nowrap">{g.label}</span>
          </Link>
        );
      }
      return (
        <div key={g.key} className={`${rowBase} ${rowSoon}`}>
          <Icon size={20} className="shrink-0" />
          <span className="whitespace-nowrap">{g.label}</span>
          <Soon />
        </div>
      );
    }

    // Expandido: acordeão
    const isOpen = open === g.key;
    return (
      <div key={g.key}>
        <button
          type="button"
          onClick={() => setOpen(isOpen ? null : g.key)}
          aria-expanded={isOpen}
          className={`${rowBase} cursor-pointer ${groupActive ? 'font-medium text-[#0094eb]' : rowOff}`}
        >
          <Icon size={20} className="shrink-0" />
          <span className="whitespace-nowrap">{g.label}</span>
          <ChevronDown size={16} className={`ml-auto shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-slate-200 pl-3">
            {g.items!.map((it) =>
              it.to ? (
                <Link
                  key={it.label}
                  to={it.to}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200 ${isOn(it.to) ? rowOn : rowOff}`}
                >
                  <span className="whitespace-nowrap">{it.label}</span>
                </Link>
              ) : (
                <div key={it.label} className={`flex items-center rounded-lg px-3 py-2 text-sm ${rowSoon}`}>
                  <span className="whitespace-nowrap">{it.label}</span>
                  <Soon />
                </div>
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800" style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}>
      <TopBar />
      <div className="flex flex-1">
        <aside
          className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 self-start border-r border-slate-200 bg-white transition-all duration-300 ease-in-out flex flex-col z-20 ${
            isExpanded ? 'w-64' : 'w-20'
          }`}
        >
          <div className="flex h-24 flex-col items-center justify-center border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0094eb] text-white shadow-md shadow-[#0094eb]/20">
                <Briefcase size={22} />
              </span>
              {isExpanded && <span className="text-xl font-bold tracking-tight text-slate-800">Gestor</span>}
            </div>
          </div>

          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={() => setCollapsedSaved(!collapsed)}
              title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                isExpanded ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#0094eb] text-white hover:bg-[#007bc4]'
              }`}
            >
              {collapsed ? (
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
            <div className="flex flex-col gap-1">{GROUPS.map(renderGroup)}</div>
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
