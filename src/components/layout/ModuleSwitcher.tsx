import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Gamepad2, Layers, LayoutDashboard, Radio } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';
import { getCatalogModules, type CatalogModule } from '@/services/plans/getCatalogShowcase';

type Item = { key: string; name: string; category: string; path: string; icon: ElementType; logo?: string; soon?: boolean };

// Modulo novo = uma linha aqui. "key" deve ser igual ao module_key / plans.modules.
// O logotipo vem do cadastro do modulo (hub_modules.logo_url); "logo" e a alternativa local.
const SWITCHER_MODULES: Item[] = [
  { key: 'vidlytics', name: 'Vidlytics Stories', category: 'Vídeos Interativos', path: '/dashboard/modules/vidlytics', icon: Layers, logo: '/assets/vidlytics-logo-ico.png' },
  { key: 'live_commerce', name: 'Stream Sell', category: 'Transmissões Ao Vivo', path: '/dashboard/modules/live-commerce', icon: Radio },
  { key: 'gamification', name: 'Gamificação', category: 'Engajamento & Prêmios', path: '/dashboard/modules/gamificacao', icon: Gamepad2, soon: true },
];

const HOME: Item = { key: 'home', name: 'SLL Hub', category: 'Visão geral da loja', path: '/dashboard', icon: LayoutDashboard, logo: '/assets/sll-hub-logo-ico.png' };

const cache = new Map<string, string[]>();

function Logo({ src, Icon, size }: { src?: string; Icon: ElementType; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Icon style={{ width: size * 0.6, height: size * 0.6 }} className="text-[#0094eb]" />;
  return <img src={src} alt="" style={{ width: size, height: size }} className="object-contain" onError={() => setFailed(true)} />;
}

export function ModuleSwitcher() {
  const { storeId } = useLoja() as { storeId: string | null };
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [owned, setOwned] = useState<string[]>(() => (storeId ? cache.get(storeId) ?? [] : []));
  const ref = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<CatalogModule[]>([]);

  useEffect(() => {
    getCatalogModules().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (supabase as any).rpc('get_store_active_modules', { p_store_id: storeId }).then(({ data, error }: any) => {
      if (error || !Array.isArray(data)) return;
      const list = data as string[];
      cache.set(storeId, list);
      if (alive) setOwned(list);
    });
    return () => { alive = false; };
  }, [storeId]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const withLogo = (m: Item): Item => {
    const c = catalog.find((x) => x.slug === m.key);
    return { ...m, logo: c?.logo_url || m.logo };
  };

  const current = useMemo(() => {
    const found = SWITCHER_MODULES.find((m) => pathname === m.path || pathname.startsWith(m.path + '/'));
    return withLogo(found ?? HOME);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, catalog]);

  const items = useMemo(() => {
    const st = new Map(catalog.map((c) => [c.slug, c.status] as [string, string]));
    const list = SWITCHER_MODULES
      .filter((m) => st.get(m.key) !== 'hidden')
      .filter((m) => owned.includes(m.key) || m.key === current.key)
      .map((m) => ({ ...withLogo(m), soon: false }));
    return [withLogo(HOME), ...list];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owned, current, catalog]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        <Logo src={current.logo} Icon={current.icon} size={20} />
        <span className="font-semibold text-slate-800">{current.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white py-2 shadow-xl">
          <div className="border-b border-slate-100 px-3.5 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seus módulos</span>
          </div>
          <div className="space-y-1 p-1.5">
            {items.map((m) => {
              const isCurrent = m.key === current.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => { setOpen(false); if (!isCurrent && !m.soon) navigate(m.path); }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${m.soon ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${isCurrent ? 'bg-blue-50/80 text-[#0094eb]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${isCurrent ? 'border-[#0094eb]/30 bg-white' : 'border-slate-100 bg-slate-50'}`}>
                      <Logo src={m.logo} Icon={m.icon} size={26} />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs font-semibold leading-tight">{m.name}</p>
                      <p className="truncate text-[11px] text-slate-400">{m.category}</p>
                    </div>
                  </div>
                  {isCurrent && <Check className="ml-2 h-4 w-4 shrink-0 text-[#0094eb]" />}
                  {m.soon && <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Em breve</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModuleSwitcher;