import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Gamepad2, Layers, LayoutDashboard, Radio } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { getActiveSubscriptions } from '@/services/subscriptions/getStoreSubscriptions';

type Item = { key: string; name: string; category: string; path: string; icon: ElementType; soon?: boolean };

// Modulo novo = uma linha aqui. "key" deve ser igual ao module_key / plans.modules.
const SWITCHER_MODULES: Item[] = [
  { key: 'vidlytics', name: 'Vidlytics Stories', category: 'Vídeos Interativos', path: '/dashboard/modules/vidlytics', icon: Layers },
  { key: 'live_commerce', name: 'Live Commerce', category: 'Transmissões Ao Vivo', path: '/dashboard/modules/live-commerce', icon: Radio },
  { key: 'gamification', name: 'Gamificação', category: 'Engajamento & Prêmios', path: '/dashboard/modules/gamificacao', icon: Gamepad2, soon: true },
];

const HOME: Item = { key: 'home', name: 'SLL Hub', category: 'Visão geral da loja', path: '/dashboard', icon: LayoutDashboard };

const cache = new Map<string, string[]>();

export function ModuleSwitcher() {
  const { storeId } = useLoja() as { storeId: string | null };
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [owned, setOwned] = useState<string[]>(() => (storeId ? cache.get(storeId) ?? [] : []));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    getActiveSubscriptions(storeId).then((subs) => {
      const keys = new Set<string>();
      for (const s of subs) {
        if (s.module_key && s.module_key !== 'bundle') keys.add(s.module_key);
        else (s.plan?.modules ?? []).forEach((m) => keys.add(m));
      }
      const list = Array.from(keys);
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

  const current = useMemo(
    () => SWITCHER_MODULES.find((m) => pathname === m.path || pathname.startsWith(m.path + '/')) ?? HOME,
    [pathname],
  );
  const items = useMemo(
    () => [HOME, ...SWITCHER_MODULES.filter((m) => owned.includes(m.key) || m.key === current.key)],
    [owned, current],
  );
  const CurrentIcon = current.icon;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 transition-all cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <CurrentIcon className="w-4 h-4 text-[#0094eb]" />
        <span className="font-semibold text-slate-800">{current.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50">
          <div className="px-3.5 py-2 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seus módulos</span>
          </div>
          <div className="p-1.5 space-y-1">
            {items.map((m) => {
              const Icon = m.icon;
              const isCurrent = m.key === current.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => { setOpen(false); if (!isCurrent && !m.soon) navigate(m.path); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${isCurrent ? 'bg-blue-50/80 text-[#0094eb]' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCurrent ? 'bg-[#0094eb] text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate leading-tight">{m.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{m.category}</p>
                    </div>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-[#0094eb] shrink-0 ml-2" />}
                  {m.soon && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">Em breve</span>}
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