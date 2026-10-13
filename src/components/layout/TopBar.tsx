import { useEffect, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, LogOut, Play, Radio, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';
import { MasterButton } from '@/components/admin/MasterButton';

const sb: any = supabase;

type Mod = { slug: string; name: string; logo_url: string | null; status: string; route_path: string | null };

const ROUTES: Record<string, string> = {
  vidlytics: '/dashboard/modules/vidlytics',
  live_commerce: '/dashboard/modules/live-commerce',
};
const TIPS: Record<string, string> = {
  vidlytics: 'Vídeos interativos e reels de alta conversão na sua loja',
  live_commerce: 'Transmissões ao vivo e lives interativas com carrinho',
};
const FALLBACK_LOGO: Record<string, string> = { vidlytics: '/assets/vidlytics-logo-ico.png' };
const FALLBACK_ICON: Record<string, ElementType> = { vidlytics: Play, live_commerce: Radio };

function Tip({ text, children, above = false }: { text: string; children: ReactNode; above?: boolean }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-[70] w-max max-w-[210px] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity delay-100 group-hover/tip:opacity-100 ${above ? 'bottom-full mb-2' : 'top-full mt-2'}`}
      >
        {text}
      </span>
    </span>
  );
}

function ModLogo({ m }: { m: Mod }) {
  const [failed, setFailed] = useState(false);
  const src = m.logo_url || FALLBACK_LOGO[m.slug];
  const Icon = FALLBACK_ICON[m.slug] ?? Play;
  if (!src || failed) {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
        <Icon className="h-5 w-5" />
      </span>
    );
  }
  return <img src={src} alt={m.name} className="h-11 w-11 object-contain" onError={() => setFailed(true)} />;
}

const initials = (name: string) =>
  (name || 'SLL').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'S';

export function TopBar(_props: { onMenuClick?: () => void; [k: string]: unknown }) {
  const navigate = useNavigate();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [mods, setMods] = useState<Mod[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [open, setOpen] = useState<'apps' | 'user' | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const full = await sb.from('hub_modules').select('slug,name,logo_url,status,route_path,sort_order').order('sort_order');
      let rows: any[] = full.error ? [] : full.data || [];
      if (full.error) {
        const basic = await sb.from('hub_modules').select('slug,name,logo_url,status,sort_order').order('sort_order');
        rows = basic.error ? [] : basic.data || [];
      }
      if (alive) setMods(rows.filter((r) => r.status !== 'hidden').map((r) => ({ ...r, route_path: r.route_path ?? null })));
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.rpc('get_store_active_modules', { p_store_id: storeId }).then(({ data }: any) => {
      if (alive && Array.isArray(data)) setOwned(data);
    });
    return () => { alive = false; };
  }, [storeId]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  const go = (path: string) => { setOpen(null); navigate(path); };
  const openMod = (m: Mod) => {
    const isOwned = owned.includes(m.slug);
    const route = m.route_path || ROUTES[m.slug];
    if (m.status === 'coming_soon' && !isOwned) return;
    go(isOwned && route ? route : `/dashboard/planos?modulo=${m.slug}`);
  };

  const item = 'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <Link to="/dashboard" aria-label="Ir para a página inicial do SLL Hub" className="flex items-center">
        {logoFailed ? (
          <span className="text-lg font-black text-[#0094eb]">SLL Hub</span>
        ) : (
          <img src="/assets/sll-logotipo.png" alt="SLL Hub" className="h-8 w-auto object-contain" onError={() => setLogoFailed(true)} />
        )}
      </Link>

      <div ref={ref} className="flex items-center gap-2">
        <MasterButton />

        <div className="relative">
          <Tip text="Alternar entre módulos e aplicativos do Hub">
            <button
              type="button"
              aria-label="Módulos e aplicativos"
              aria-expanded={open === 'apps'}
              onClick={() => setOpen(open === 'apps' ? null : 'apps')}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-colors ${open === 'apps' ? 'bg-[#0094eb]/10 text-[#0094eb]' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                {[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.9} />))}
              </svg>
            </button>
          </Tip>

          {open === 'apps' && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[300px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Módulos do Hub</p>
              <div className="grid grid-cols-2 gap-2">
                {mods.map((m) => {
                  const isOwned = owned.includes(m.slug);
                  const soon = m.status === 'coming_soon' && !isOwned;
                  return (
                    <Tip key={m.slug} text={TIPS[m.slug] ?? m.name} above>
                      <button
                        type="button"
                        disabled={soon}
                        onClick={() => openMod(m)}
                        className={`flex w-full flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${soon ? 'cursor-not-allowed border-slate-100 opacity-60' : 'cursor-pointer border-slate-200 hover:border-[#0094eb]/50 hover:bg-slate-50'}`}
                      >
                        <ModLogo m={m} />
                        <span className="text-xs font-bold text-slate-800">{m.name}</span>
                        <span className={`text-[10px] font-semibold ${isOwned ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isOwned ? 'Ativo' : soon ? 'Em breve' : 'Ativar'}
                        </span>
                      </button>
                    </Tip>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Menu da conta"
            aria-expanded={open === 'user'}
            onClick={() => setOpen(open === 'user' ? null : 'user')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#0094eb] text-xs font-black text-white hover:bg-[#007fcc]"
          >
            {initials(store?.name)}
          </button>
          {open === 'user' && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <p className="truncate px-3 py-2 text-xs font-bold text-slate-500">{store?.name}</p>
              <button type="button" className={item} onClick={() => go('/dashboard/settings')}><Settings className="h-4 w-4" /> Configurações</button>
              <button type="button" className={item} onClick={() => go('/dashboard/assinaturas')}><CreditCard className="h-4 w-4" /> Assinatura e planos</button>
              <button type="button" className={`${item} text-rose-600 hover:bg-rose-50`} onClick={() => { setOpen(null); void signOut(); }}>
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;