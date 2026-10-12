import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Ruler, LayoutGrid, Video, Play, Radio, GraduationCap, Crown, Plug,
  CreditCard, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Gift, Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

type PlanState = { kind: 'trial'; days: number } | { kind: 'expired' } | null;
type Item = { name: string; icon: ElementType; path: string; exact?: boolean };
type Group = { title: string; items: Item[]; bottom?: boolean };

const sb: any = supabase;

const MODULE_SHORTCUTS: Record<string, Item> = {
  vidlytics: { name: 'Vidlytics', icon: Play, path: '/dashboard/modules/vidlytics' },
  live_commerce: { name: 'Live Commerce', icon: Radio, path: '/dashboard/modules/live-commerce' },
};

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const isExpanded = !isCollapsed;
  const ctx: any = useLoja();
  const storeId: string | null = ctx?.loja?.id ?? ctx?.store?.id ?? ctx?.storeId ?? ctx?.lojaId ?? null;
  const [plan, setPlan] = useState<PlanState>(null);
  const [owned, setOwned] = useState<string[]>([]);

  useEffect(() => {
    if (!storeId) { setPlan(null); setOwned([]); return; }
    let alive = true;
    (async () => {
      const [subsRes, modsRes] = await Promise.all([
        sb.from('subscriptions').select('status, current_period_end, is_current').eq('store_id', storeId).eq('is_current', true),
        sb.rpc('get_store_active_modules', { p_store_id: storeId }),
      ]);
      if (!alive) return;

      if (!modsRes.error && Array.isArray(modsRes.data)) {
        const slugs = (modsRes.data as any[])
          .map((m) => (typeof m === 'string' ? m : m?.slug ?? m?.module_slug ?? m?.module ?? ''))
          .map((s) => String(s).toLowerCase().replace(/-/g, '_'))
          .filter(Boolean);
        setOwned(Array.from(new Set(slugs)));
      }

      if (subsRes.error || !subsRes.data) return;
      const rows = subsRes.data as any[];
      if (rows.some((s) => s.status === 'active')) { setPlan(null); return; }
      const trials = rows.filter((s) => s.status === 'trialing' && s.current_period_end);
      const now = Date.now();
      const live = trials.map((s) => new Date(s.current_period_end).getTime()).filter((t) => t > now);
      if (live.length) {
        setPlan({ kind: 'trial', days: Math.max(1, Math.ceil((Math.min(...live) - now) / 86400000)) });
      } else if (trials.length) {
        setPlan({ kind: 'expired' });
      } else {
        setPlan(null);
      }
    })();
    return () => { alive = false; };
  }, [storeId]);

  const moduleItems = owned.map((slug) => MODULE_SHORTCUTS[slug]).filter(Boolean) as Item[];
  const ecosystemItems: Item[] = moduleItems.length
    ? moduleItems
    : [{ name: 'Módulos', icon: Video, path: '/dashboard/modules' }];

  const groups: Group[] = [
    {
      title: 'Operação',
      items: [
        { name: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard', exact: true },
        { name: 'Produtos & SKUs', icon: Package, path: '/dashboard/produtos' },
        { name: 'Tabela de Medidas', icon: Ruler, path: '/dashboard/medidas' },
      ],
    },
    {
      title: 'Ecossistema',
      items: [
        ...ecosystemItems,
        { name: 'Explorar módulos', icon: LayoutGrid, path: '/dashboard/planos' },
      ],
    },
    {
      title: 'Crescimento',
      items: [
        { name: 'SLL Academy', icon: GraduationCap, path: '/dashboard/dicas' },
        { name: 'Clube SLL', icon: Crown, path: '/dashboard/afiliados' },
      ],
    },
    {
      title: 'Sistema & Gestão',
      bottom: true,
      items: [
        { name: 'Instalação & Script', icon: Plug, path: '/dashboard/integracao' },
        { name: 'Assinatura & Planos', icon: CreditCard, path: '/dashboard/assinaturas' },
        { name: 'Configurações', icon: Settings, path: '/dashboard/settings' },
      ],
    },
  ];

  const isActive = (it: Item) =>
    it.exact
      ? location.pathname === it.path
      : location.pathname === it.path || location.pathname.startsWith(it.path + '/');

  const renderItem = (it: Item) => {
    const Icon = it.icon;
    const active = isActive(it);
    return (
      <Link
        key={it.name}
        to={it.path}
        title={!isExpanded ? it.name : undefined}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
          !isExpanded ? 'justify-center' : ''
        } ${
          active
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
    <div key={g.title} className={`${idx > 0 ? 'mt-5' : ''} ${g.bottom ? 'mt-auto pt-5' : ''}`}>
      {isExpanded ? (
        <p className="px-4 mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{g.title}</p>
      ) : (
        idx > 0 && <div className="mx-3 mb-2 border-t border-slate-200 dark:border-slate-800" />
      )}
      <div className="flex flex-col gap-1">{g.items.map(renderItem)}</div>
    </div>
  );

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
            <img src="/assets/sll-hub-logo-wide.png" alt="SLL Hub" className="h-10 w-auto object-contain" />
          ) : (
            <img src="/assets/sll-hub-logo-ico.png" alt="SLL Hub" className="h-9 w-9 object-contain" />
          )}
        </div>
      </div>

      {/* Botão Recolher/Expandir */}
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

      {/* Navegação em grupos */}
      <nav className="flex-1 flex flex-col px-4 py-5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {groups.map(renderGroup)}
      </nav>

      {/* Rodapé: upsell + teste + sair */}
      <div className="px-4 pt-3 pb-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {storeId && (
          isExpanded ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Gift size={16} className="shrink-0" />
                  <p className="text-xs font-bold">Próximo módulo: Live Commerce</p>
                </div>
                <Link
                  to="/dashboard/planos"
                  className="mt-2 block rounded-lg bg-emerald-600 py-1.5 text-center text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Conhecer
                </Link>
              </div>

              {plan && (
                <div className={`rounded-xl border p-3 ${plan.kind === 'trial' ? 'border-[#0094eb]/30 bg-[#0094eb]/5' : 'border-red-200 bg-red-50'}`}>
                  <div className={`flex items-center gap-2 ${plan.kind === 'trial' ? 'text-[#0094eb]' : 'text-red-600'}`}>
                    <Clock size={16} className="shrink-0" />
                    <p className="text-xs font-bold">
                      {plan.kind === 'trial'
                        ? `Período de teste: ${plan.days} ${plan.days === 1 ? 'dia restante' : 'dias restantes'}`
                        : 'Teste encerrado'}
                    </p>
                  </div>
                  <Link
                    to="/dashboard/planos"
                    className={`mt-2 block rounded-lg py-1.5 text-center text-xs font-bold text-white ${
                      plan.kind === 'trial' ? 'bg-[#0094eb] hover:bg-[#007bc4]' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Assinar agora
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <Link
                to="/dashboard/planos"
                title="Próximo módulo: Live Commerce"
                className="flex items-center justify-center rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
              >
                <Gift size={18} />
              </Link>
              {plan && (
                <Link
                  to="/dashboard/planos"
                  title={plan.kind === 'trial' ? `Teste: ${plan.days} dia(s) restante(s)` : 'Teste encerrado'}
                  className={`flex items-center justify-center rounded-lg p-2 ${
                    plan.kind === 'trial' ? 'bg-[#0094eb]/10 text-[#0094eb]' : 'bg-red-50 text-red-600'
                  }`}
                >
                  <Clock size={18} />
                </Link>
              )}
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