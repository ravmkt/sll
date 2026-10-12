import { useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, CreditCard, Crown, Lightbulb, LayoutDashboard, LogOut, Menu, Package, Play, Plug, Radio, Settings, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';
import { getActiveSubscriptions } from '@/services/subscriptions/getStoreSubscriptions';
import { StoreBrand } from '@/components/layout/StoreBrand';
import { MasterButton } from '@/components/admin/MasterButton';

type NavItem = { label: string; to: string; icon: ElementType; match: string[]; exact?: boolean };

const NAV: NavItem[] = [
  { label: 'Visão Geral', to: '/dashboard', icon: LayoutDashboard, match: ['/dashboard'], exact: true },
  { label: 'Produtos & Catálogo', to: '/dashboard/produtos', icon: Package, match: ['/dashboard/produtos', '/dashboard/medidas'] },
  { label: 'Insights do Noah', to: '/dashboard/dicas', icon: Lightbulb, match: ['/dashboard/dicas'] },
];

const ADMIN = [
  { label: 'Instalação & Script', to: '/dashboard/integracao', icon: Plug },
  { label: 'Configurações da Loja', to: '/dashboard/settings', icon: Settings },
  { label: 'Assinatura & Planos', to: '/dashboard/assinaturas', icon: CreditCard },
  { label: 'Clube SLL', to: '/dashboard/afiliados', icon: Crown },
];

// Modulo novo = uma linha aqui. "key" deve ser igual ao module_key.
const MODULES = [
  { key: 'vidlytics', name: 'Vidlytics', icon: Play, path: '/dashboard/modules/vidlytics' },
  { key: 'live_commerce', name: 'Live Commerce', icon: Radio, path: '/dashboard/modules/live-commerce' },
];

const ownedCache = new Map<string, string[]>();

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

function Dots() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      {[3, 9, 15].flatMap((y) => [3, 9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
    </svg>
  );
}

function AppLauncher({ storeId }: { storeId: string | null }) {
  const [open, setOpen] = useState(false);
  const [owned, setOwned] = useState<string[]>(() => (storeId ? ownedCache.get(storeId) ?? [] : []));
  const ref = useOutside(open, () => setOpen(false));

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    getActiveSubscriptions(storeId).then((subs: any[]) => {
      const keys = new Set<string>();
      for (const s of subs) {
        if (s.module_key && s.module_key !== 'bundle') keys.add(s.module_key);
        else (s.plan?.modules ?? []).forEach((m: string) => keys.add(m));
      }
      const list = Array.from(keys);
      ownedCache.set(storeId, list);
      if (alive) setOwned(list);
    }).catch(() => { /* mantem lista atual */ });
    return () => { alive = false; };
  }, [storeId]);

  const mine = MODULES.filter((m) => owned.includes(m.key));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir módulos"
        aria-expanded={open}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0094eb]"
      >
        <Dots />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Seus módulos</p>
          {mine.length === 0 ? (
            <p className="px-1 pb-2 text-xs text-slate-500">Nenhum módulo ativo ainda.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mine.map((m) => {
                const Icon = m.icon;
                return (
                  <Link key={m.key} to={m.path} onClick={() => setOpen(false)} className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors hover:bg-slate-50">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]"><Icon size={20} /></span>
                    <span className="text-[11px] font-semibold leading-tight text-slate-700">{m.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <Link to="/dashboard/planos" onClick={() => setOpen(false)} className="mt-2 block rounded-lg border-t border-slate-100 px-1 pt-3 text-xs font-bold text-[#0094eb] hover:underline">
            Explorar módulos →
          </Link>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { storeId, store } = useLoja() as { storeId: string | null; store: any };
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const menuRef = useOutside(menu, () => setMenu(false));

  useEffect(() => { setMenu(false); setDrawer(false); }, [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const isActive = (n: NavItem) =>
    n.exact ? pathname === n.to : n.match.some((m) => pathname === m || pathname.startsWith(m + '/'));

  const name = String(store?.name || 'Minha loja');
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || 'L';

  return (
    <header data-tour="topbar" className="sticky z-30 border-b border-slate-200 bg-white/90 backdrop-blur" style={{ top: 'var(--trial-h, 0px)' }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Esquerda */}
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" aria-label="Abrir menu" onClick={() => setDrawer(true)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
            <Menu size={20} />
          </button>
          <Link to="/dashboard" aria-label="SLL Hub">
            <img src="/assets/sll-logotipo.png" alt="SLL Hub" className="h-8 w-auto object-contain" />
          </Link>
          <div className="hidden lg:block"><StoreBrand /></div>
        </div>

        {/* Centro */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Navegação principal">
          {NAV.map((n) => {
            const on = isActive(n);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={on ? 'page' : undefined}
                className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${on ? 'text-[#0094eb]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="whitespace-nowrap">{n.label}</span>
                {on && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-[#0094eb]" />}
              </Link>
            );
          })}
        </nav>

        {/* Direita */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
          <MasterButton />
          <AppLauncher storeId={storeId} />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-label="Menu da conta"
              aria-expanded={menu}
              className="flex cursor-pointer items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0094eb] text-xs font-black text-white">{initials}</span>
              <ChevronDown size={14} className={`hidden text-slate-400 transition-transform sm:block ${menu ? 'rotate-180' : ''}`} />
            </button>
            {menu && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                <div className="border-b border-slate-100 px-4 pb-2">
                  <p className="truncate text-sm font-bold text-slate-800">{name}</p>
                  <p className="text-[11px] text-slate-400">Conta da loja</p>
                </div>
                <div className="p-1.5">
                  {ADMIN.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Link key={a.to} to={a.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0094eb]">
                        <Icon size={16} className="shrink-0" /> {a.label}
                      </Link>
                    );
                  })}
                </div>
                <div className="mx-1.5 border-t border-slate-100 pt-1.5">
                  <button type="button" onClick={() => signOut()} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600">
                    <LogOut size={16} className="shrink-0" /> Sair da Plataforma
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <img src="/assets/sll-logotipo.png" alt="SLL Hub" className="h-8 w-auto object-contain" />
              <button type="button" aria-label="Fechar menu" onClick={() => setDrawer(false)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-3">
              <div>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Navegação</p>
                {NAV.map((n) => {
                  const Icon = n.icon;
                  const on = isActive(n);
                  return (
                    <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${on ? 'bg-[#0094eb] text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <Icon size={18} /> {n.label}
                    </Link>
                  );
                })}
              </div>
              <div>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Conta</p>
                {ADMIN.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Link key={a.to} to={a.to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      <Icon size={18} /> {a.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-slate-100 p-3">
              <button type="button" onClick={() => signOut()} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600">
                <LogOut size={18} /> Sair da Plataforma
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

export default TopBar;