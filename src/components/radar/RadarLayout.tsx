import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Lightbulb, LayoutGrid, ListChecks, LogOut, PanelLeftClose, PanelLeftOpen,
  Plug, Radar, RefreshCw, Settings, Shield, Sparkles, TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { RadarStoreProvider, useRadarCtx } from '@/hooks/radar/useRadarStore';
import { ErrorBox, Skeleton } from './RadarUI';

const menu = [
  { to: '/dashboard/modules/radar', label: 'Visão Geral', icon: LayoutGrid, end: true },
  { to: '/dashboard/modules/radar/conexoes', label: 'Conexões', icon: Plug, end: false },
  { to: '/dashboard/modules/radar/rankings', label: 'Rankings', icon: TrendingUp, end: false },
  { to: '/dashboard/modules/radar/tarefas', label: 'Tarefas', icon: ListChecks, end: false },
  { to: '/dashboard/modules/radar/produtos', label: 'Produtos (IA)', icon: Sparkles, end: false },
  { to: '/dashboard/modules/radar/oportunidades', label: 'Oportunidades', icon: Lightbulb, end: false },
  { to: '/dashboard/modules/radar/configuracoes', label: 'Configurações', icon: Settings, end: false },
];

function Shell() {
  const { store, userName, isMaster, loading, error } = useRadarCtx();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const initial = (store?.name ?? userName).charAt(0).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          {store?.logoUrl ? (
            <img src={store.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">{initial}</div>
          )}
          <span className="text-sm font-semibold">{store?.name ?? '...'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isMaster && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white">
              <Shield className="h-3.5 w-3.5" /> Master
            </span>
          )}
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aplicativo ativado
            <span className="relative h-4 w-7 rounded-full bg-emerald-500"><span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white" /></span>
          </span>
          <button type="button" onClick={() => window.location.reload()} className="hidden items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 sm:inline-flex">
            <RefreshCw className="h-3.5 w-3.5" /> Limpar cache
          </button>
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Radar
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className={`${collapsed ? 'w-16' : 'w-64'} hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all md:flex`}>
          <div className="flex h-24 items-center justify-center gap-2 border-b border-slate-100">
            <Radar className="h-7 w-7 text-blue-600" />
            {!collapsed && <span className="text-2xl font-bold text-slate-900">Rad<span className="text-blue-600">ar</span></span>}
          </div>
          <div className="p-3">
            <button type="button" onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600">
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Recolher</>}
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {menu.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to} to={to} end={end} title={label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-blue-600 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50'} ${collapsed ? 'justify-center' : ''}`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </nav>
          {!collapsed && (
            <div className="px-3 pb-3">
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Ver tour desta página
              </button>
            </div>
          )}
          <div className="space-y-1 border-t border-slate-100 p-3 text-sm text-slate-600">
            <button type="button" onClick={() => navigate('/dashboard/modules')} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 ${collapsed ? 'justify-center' : ''}`}>
              <ArrowLeft className="h-4 w-4" /> {!collapsed && 'Voltar ao SLL'}
            </button>
            <button type="button" onClick={signOut} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 ${collapsed ? 'justify-center' : ''}`}>
              <LogOut className="h-4 w-4" /> {!collapsed && 'Sair da Plataforma'}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 space-y-6 p-4 md:p-6">
            <nav className="flex gap-1 overflow-x-auto md:hidden">
              {menu.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  {label}
                </NavLink>
              ))}
            </nav>
            {loading && <Skeleton className="h-40 w-full" />}
            {error && <ErrorBox message={error} />}
            {store && <Outlet />}
          </main>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-400">
            <span>© 2026 SLL Hub. Todos os direitos reservados.</span>
            <span>Desenvolvido por: <b className="text-slate-600">RAV Marketing e Treinamento LTDA</b></span>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function RadarLayout() {
  return (
    <RadarStoreProvider>
      <Shell />
    </RadarStoreProvider>
  );
}