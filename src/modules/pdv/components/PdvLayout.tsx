import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Download, Loader2, LogOut, Package, PanelLeftClose, PanelLeftOpen,
  RefreshCw, ShieldOff, ShoppingCart, Store, Wallet, Wifi, WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import ForcePasswordChange from '@/modules/gestor/components/ForcePasswordChange';
import { GestorAccessProvider, useGestorAccess } from '@/modules/gestor/hooks/useGestorAccess';
import { usePdvOffline } from '@/modules/gestor/hooks/usePdvOffline';
import PdvStatusBar from './PdvStatusBar';
import { getPaper } from '../offline/receiptConfig';
import type { Paper } from '../offline/receiptConfig';
import { usePdvNet } from '@/modules/gestor/services/pdvNet';
import { usePwaInstall } from '../hooks/usePwaInstall';

const PAPER_KEY = 'sll-pdv-paper';
const SIDEBAR_KEY = 'sll_pdv_sidebar_collapsed';
export const PDV_BASE = '/dashboard/modules/pdv';

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; area: string; act: string };

const ITEMS: Item[] = [
  { to: PDV_BASE, label: 'Venda', icon: ShoppingCart, end: true, area: 'pedidos', act: 'editar' },
  { to: `${PDV_BASE}/caixa`, label: 'Caixa', icon: Wallet, area: 'pedidos', act: 'editar' },
  { to: `${PDV_BASE}/pedidos`, label: 'Pedidos', icon: ClipboardList, area: 'pedidos', act: 'ver' },
  { to: `${PDV_BASE}/produtos`, label: 'Produtos', icon: Package, area: 'produtos', act: 'ver' },
];

const SELLER_TO = new Set([PDV_BASE, `${PDV_BASE}/caixa`]);

const rowCls = (collapsed: boolean) => ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg py-2.5 text-sm font-medium transition-all ${
    collapsed ? 'justify-center px-0' : 'gap-3 px-4'
  } ${
    isActive
      ? 'bg-[color:var(--sll-b-brand)] text-white shadow-md'
      : 'text-slate-600 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

const sellerLinkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
    isActive
      ? 'bg-[color:var(--sll-b-brand)] text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

type SellerBarProps = {
  online: boolean;
  manual: boolean;
  pending: number;
  syncing: boolean;
  expired: boolean;
  lastError: string | null;
  canSync: boolean;
  canInstall: boolean;
  items: Item[];
  onToggleManual: () => void;
  onCheck: () => void;
  onSync: () => void;
  onInstall: () => void;
  onSignOut: () => void;
};

function SellerBar(p: SellerBarProps) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <nav className="flex items-center gap-1">
        {p.items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={sellerLinkCls} title={i.label}>
            <i.icon size={18} className="shrink-0" />
            <span className="hidden sm:inline">{i.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {p.expired && (
          <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
            Sessão offline expirada: conecte-se
          </span>
        )}
        {p.lastError && (
          <span title={p.lastError} className="hidden rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400 md:inline">
            Erro ao sincronizar
          </span>
        )}
        {p.pending > 0 && (
          <button
            type="button"
            onClick={p.onSync}
            disabled={!p.canSync || p.syncing}
            title="Enviar as vendas guardadas"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-900/40 dark:text-amber-300"
          >
            {p.syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {p.pending} na fila
          </button>
        )}

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
            p.online
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          }`}
        >
          {p.online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {p.online ? 'Online' : 'Offline'}
        </span>

        {!p.online && !p.manual && (
          <button
            type="button"
            onClick={p.onCheck}
            className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Testar conexão
          </button>
        )}

        <button
          type="button"
          onClick={p.onToggleManual}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            p.manual
              ? 'bg-[color:var(--sll-b-brand)] text-white hover:bg-[color:var(--sll-b-brand-hover)]'
              : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          {p.manual ? 'Voltar ao online' : 'Usar modo offline'}
        </button>

        {p.canInstall && (
          <button
            type="button"
            onClick={p.onInstall}
            title="Instalar app"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={14} /> <span className="hidden md:inline">Instalar app</span>
          </button>
        )}

        <button
          type="button"
          onClick={p.onSignOut}
          title="Sair"
          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function Inner() {
  const { loading, error, access, isManager, can } = useGestorAccess();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const off = usePdvOffline();
  const net = usePdvNet();
  const pwa = usePwaInstall();
  const [paper, setPaper] = useState<Paper>(getPaper);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_KEY);
      return v === null ? window.innerWidth < 768 : v === '1';
    } catch { return false; }
  });

  const changePaper = (p: Paper) => {
    setPaper(p);
    try { localStorage.setItem(PAPER_KEY, p); } catch { /* sem acesso ao storage */ }
  };
  const toggleSidebar = () => {
    const v = !collapsed;
    setCollapsed(v);
    try { localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0'); } catch { /* sem acesso ao storage */ }
  };

  const hasAccess = !loading && !error && !!access && access.active !== false;
  const visible = ITEMS.filter((i) => can(i.area, i.act));
  const wrapStyle = { paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' };
  const doSignOut = () => { void signOut(); };

  // Carregando ou sem acesso: tela simples
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100" style={wrapStyle}>
        <ForcePasswordChange />
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : (
          <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <ShieldOff className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="font-semibold">{error ? 'Não foi possível verificar suas permissões' : 'Sem acesso ao PDV'}</p>
            <p className="mt-1 text-sm text-slate-500">{error ? 'Recarregue a página.' : 'Peça ao administrador da loja para liberar seu acesso.'}</p>
            <button type="button" onClick={doSignOut} className="mt-4 cursor-pointer rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Sair</button>
          </div>
        )}
      </div>
    );
  }

  // VENDEDOR: só a venda, tela única, sem rolagem da página
  if (!isManager) {
    const sellerItems = visible.filter((i) => SELLER_TO.has(i.to));
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100" style={wrapStyle}>
        <ForcePasswordChange />
        <SellerBar
          online={!!off.online}
          manual={net.manual}
          pending={Number(off.pending) || 0}
          syncing={!!off.syncing}
          expired={!!off.expired}
          lastError={off.lastError ? String(off.lastError) : null}
          canSync={!!off.canSync}
          canInstall={pwa.canInstall}
          items={sellerItems}
          onToggleManual={() => net.setManual(!net.manual)}
          onCheck={() => { void net.check(); }}
          onSync={() => { void off.sync(true); }}
          onInstall={() => { void pwa.install(); }}
          onSignOut={doSignOut}
        />
        <main className="min-h-0 flex-1 overflow-auto p-2 sm:p-3"><Outlet /></main>
      </div>
    );
  }

  // GESTOR: TopBar, sidebar recolhivel e barra de status completa
  const expanded = !collapsed;
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100" style={wrapStyle}>
      <ForcePasswordChange />
      <TopBar />
      <div className="flex flex-1">
        <aside
          className={`sticky top-[calc(var(--trial-h,0px)_+_3.5rem)] z-20 flex h-[calc(100vh_-_var(--trial-h,0px)_-_3.5rem)] shrink-0 flex-col self-start border-r border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-slate-700 dark:bg-slate-900 ${
            expanded ? 'w-64' : 'w-20'
          }`}
        >
          <div className="flex h-20 items-center justify-center gap-2 border-b border-slate-200 p-4 dark:border-slate-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--sll-b-brand)] text-white shadow-md"><Store size={20} /></span>
            {expanded && <span className="text-lg font-bold tracking-tight">PDV</span>}
          </div>

          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={toggleSidebar}
              title={expanded ? 'Recolher menu' : 'Expandir menu'}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                expanded
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  : 'bg-[color:var(--sll-b-brand)] text-white hover:bg-[color:var(--sll-b-brand-hover)]'
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

          <nav className="flex min-h-0 flex-col gap-1 overflow-y-auto px-4 py-5 [&::-webkit-scrollbar]:hidden">
            {visible.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} title={!expanded ? i.label : undefined} className={rowCls(collapsed)}>
                <i.icon size={20} className="shrink-0" />
                {expanded && <span className="whitespace-nowrap">{i.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-1 border-t border-slate-200 px-4 pb-4 pt-3 dark:border-slate-700">
            <Link
              to="/dashboard/modules/gestor"
              title={!expanded ? 'Abrir o Gestor' : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800 ${expanded ? 'justify-start' : 'justify-center'}`}
            >
              <Store size={18} className="shrink-0" />
              {expanded && <span className="whitespace-nowrap">Abrir o Gestor</span>}
            </Link>
            <Link
              to="/dashboard"
              title={!expanded ? 'Voltar ao SLL' : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800 ${expanded ? 'justify-start' : 'justify-center'}`}
            >
              <ArrowLeft size={18} className="shrink-0" />
              {expanded && <span className="whitespace-nowrap">Voltar ao SLL</span>}
            </Link>
            <button
              type="button"
              onClick={doSignOut}
              title={!expanded ? 'Sair da Plataforma' : undefined}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 ${expanded ? 'justify-start' : 'justify-center'}`}
            >
              <LogOut size={18} className="shrink-0" />
              {expanded && <span>Sair da Plataforma</span>}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
            <PdvStatusBar
              online={off.online}
              pending={off.pending}
              syncing={off.syncing}
              expired={off.expired}
              lastError={off.lastError}
              paper={paper}
              onPaper={changePaper}
              canSync={off.canSync}
              manual={net.manual}
              onToggleManual={() => net.setManual(!net.manual)}
              onCheck={() => { void net.check(); }}
              canInstall={pwa.canInstall}
              onInstall={() => { void pwa.install(); }}
              showPaper={isManager}
              onSync={() => { void off.sync(true); }}
            />
          </div>
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6"><Outlet /></main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}

export default function PdvLayout() {
  return (
    <GestorAccessProvider>
      <Inner />
    </GestorAccessProvider>
  );
}