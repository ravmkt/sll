
import type { ElementType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Lightbulb, Crown, Plug,
  CreditCard, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Gift, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';


interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}


type Item = { name: string; icon: ElementType; path: string; exact?: boolean };
type Group = { title: string; items: Item[]; bottom?: boolean };



const GROUPS: Group[] = [
  {
    title: 'Operação',
    items: [
      { name: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard', exact: true },
      { name: 'Produtos & Catálogo', icon: Package, path: '/dashboard/produtos' },
    ],
  },
  // Ecossistema oculto temporariamente: reativar quando houver mais módulos além do Vidlytics.
  // { title: 'Ecossistema', items: [{ name: 'Módulos do Hub', icon: LayoutGrid, path: '/dashboard/planos' }] },
  {
    title: 'Comunidade & Ensino',
    items: [
      { name: 'Insights do Noah', icon: Lightbulb, path: '/dashboard/dicas' },
  { name: 'Pedidos dos lojistas', icon: MessageSquarePlus, path: '/dashboard/pedidos-dos-lojistas' },
      { name: 'Clube SLL (Indique e Ganhe)', icon: Crown, path: '/dashboard/afiliados' },
    ],
  },
  {
    title: 'Sistema',
    bottom: true,
    items: [
      { name: 'Instalação & Script', icon: Plug, path: '/dashboard/integracao' },
      { name: 'Configurações', icon: Settings, path: '/dashboard/settings' },
      { name: 'Assinatura & Planos', icon: CreditCard, path: '/dashboard/assinaturas' },
    ],
  },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const isExpanded = !isCollapsed;
  const ctx: any = useLoja();
  const storeId: string | null = ctx?.loja?.id ?? ctx?.store?.id ?? ctx?.storeId ?? ctx?.lojaId ?? null;


  const isActive = (it: Item) =>
    it.exact
      ? location.pathname === it.path
      : location.pathname === it.path || location.pathname.startsWith(it.path + '/');

  const renderItem = (it: Item) => {
    const Icon = it.icon;
    return (
      <Link
        key={it.name}
        to={it.path}
        title={!isExpanded ? it.name : undefined}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
          !isExpanded ? 'justify-center' : ''
        } ${
          isActive(it)
            ? 'bg-[#0094eb] text-white font-medium shadow-md shadow-[#0094eb]/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0094eb]'
        }`}
      >
        <Icon size={20} className="shrink-0" />
        {isExpanded && <span className="whitespace-nowrap">{it.name}</span>}
      </Link>
    );
  };

  const renderGroup = (g: Group, idx: number) => (
    <div key={g.title} className={idx > 0 ? 'mt-5' : ''}>
      {isExpanded ? (
        <p className="px-4 mb-1.5 text-[11px] font-semibold tracking-wider text-slate-900 dark:text-white uppercase">{g.title}</p>
      ) : (
        idx > 0 && <div className="mx-3 mb-2 border-t border-slate-200 dark:border-slate-800" />
      )}
      <div className="flex flex-col gap-1">{g.items.map(renderItem)}</div>
    </div>
  );

  return (
    <aside
      className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 self-start border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] transition-all duration-300 ease-in-out flex flex-col z-20 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-4 flex flex-col gap-3 h-24 justify-center border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-center items-center">
          {isExpanded ? (
            <img src="/assets/sll-hub-logo-wide.png" alt="SLL Hub" className="h-10 w-auto object-contain" />
          ) : (
            <img src="/assets/sll-hub-logo-ico.png" alt="SLL Hub" className="h-9 w-9 object-contain" />
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

      <nav className="flex-1 flex flex-col px-4 py-5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {GROUPS.map(renderGroup)}
      </nav>

      <div className="px-4 pt-3 pb-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {storeId && (
          isExpanded ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Gift size={16} className="shrink-0" />
                  <p className="text-xs font-bold">Próximo módulo: Stream Sell</p>
                </div>
                <Link
                  to="/dashboard/planos"
                  className="mt-2 block rounded-lg bg-emerald-600 py-1.5 text-center text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Conhecer
                </Link>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/dashboard/planos"
                title="Próximo módulo: Stream Sell"
                className="flex items-center justify-center rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
              >
                <Gift size={18} />
              </Link>
            </>
          )
        )}

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