import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Loader2, Package, ShieldOff, ShoppingCart, Store, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { AppFooter } from '@/components/layout/AppFooter';
import ForcePasswordChange from '@/modules/gestor/components/ForcePasswordChange';
import { GestorAccessProvider, useGestorAccess } from '@/modules/gestor/hooks/useGestorAccess';
import { usePdvOffline } from '@/modules/gestor/hooks/usePdvOffline';
import PdvStatusBar from './PdvStatusBar';
import { getPaper } from '../offline/receiptConfig';
import type { Paper } from '../offline/receiptConfig';
import { usePdvNet } from '@/modules/gestor/services/pdvNet';
import { usePwaInstall } from '../hooks/usePwaInstall';

const PAPER_KEY = 'sll-pdv-paper';
export const PDV_BASE = '/dashboard/modules/pdv';

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; area: string; act: string };

const ITEMS: Item[] = [
  { to: PDV_BASE, label: 'Venda', icon: ShoppingCart, end: true, area: 'pedidos', act: 'editar' },
  { to: `${PDV_BASE}/caixa`, label: 'Caixa', icon: Wallet, area: 'pedidos', act: 'editar' },
  { to: `${PDV_BASE}/pedidos`, label: 'Pedidos', icon: ClipboardList, area: 'pedidos', act: 'ver' },
  { to: `${PDV_BASE}/produtos`, label: 'Produtos', icon: Package, area: 'produtos', act: 'ver' },
];

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
    isActive
      ? 'bg-[color:var(--sll-b-brand)] text-white shadow-md'
      : 'text-slate-600 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

function Inner() {
  const { loading, error, access, isManager, can } = useGestorAccess();
  const off = usePdvOffline();
  const net = usePdvNet();
  const pwa = usePwaInstall();
  const [paper, setPaper] = useState<Paper>(getPaper);
  const changePaper = (p: Paper) => {
    setPaper(p);
    try { localStorage.setItem(PAPER_KEY, p); } catch { /* sem acesso ao storage */ }
  };
  const hasAccess = !loading && !error && !!access && access.active !== false;

  const body = loading ? (
    <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>
  ) : error || !access || access.active === false ? (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <ShieldOff className="mx-auto mb-3 h-8 w-8 text-slate-400" />
      <p className="font-semibold">{error ? 'Não foi possível verificar suas permissões' : 'Sem acesso ao PDV'}</p>
      <p className="mt-1 text-sm text-slate-500">{error ? 'Recarregue a página.' : 'Peça ao administrador da loja para liberar seu acesso.'}</p>
    </div>
  ) : (
    <Outlet />
  );

  const visible = ITEMS.filter((i) => can(i.area, i.act));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100" style={{ paddingTop: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px))' }}>
      <ForcePasswordChange />
      <TopBar />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:w-60 md:border-b-0 md:border-r">
          <div className="hidden items-center gap-2 px-5 py-5 md:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--sll-b-brand)] text-white shadow-md"><Store size={20} /></span>
            <span className="text-lg font-bold tracking-tight">PDV</span>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:px-4 md:py-2">
            {visible.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={linkCls}>
                <i.icon size={18} className="shrink-0" /> {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden border-t border-slate-200 p-4 dark:border-slate-700 md:block">
            {isManager && (
              <Link to="/dashboard/modules/gestor" className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800">
                Abrir o Gestor
              </Link>
            )}
            <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800">
              <ArrowLeft size={16} /> Voltar ao SLL
            </Link>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {hasAccess && (
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
              )}
              <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{body}</main>
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