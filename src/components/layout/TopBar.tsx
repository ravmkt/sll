import ClearCacheButton from '@/components/layout/ClearCacheButton';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, LogOut, Settings, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';
import { MasterButton } from '@/components/admin/MasterButton';
import { ModuleSwitcher } from '@/components/layout/ModuleSwitcher';

const sb: any = supabase;

const initials = (name: string) =>
  (name || 'Loja').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'L';

// Header global: continuo, fica por cima da Sidebar. "actions" recebe controles do modulo (ex.: switch do app).
export function TopBar({ actions }: { actions?: ReactNode; [k: string]: unknown }) {
  const navigate = useNavigate();
  const { signOut } = useAuth() as { signOut: () => Promise<unknown> | void };
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [open, setOpen] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.from('store_settings').select('logo_url,store_name').eq('store_id', storeId).maybeSingle()
      .then(({ data }: any) => {
        if (!alive) return;
        setLogo(((data?.logo_url as string) || store?.logo_url || '').trim() || null);
        setName(((data?.store_name as string) || '').trim());
        setLogoFailed(false);
      });
    return () => { alive = false; };
  }, [storeId, store?.logo_url]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  const go = (path: string) => { setOpen(false); navigate(path); };
  const storeName = name || store?.name || 'Minha loja';
  const item = 'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100';

  return (
    <header className="sticky top-[var(--trial-h,0px)] z-40 flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <Link to="/dashboard" aria-label="Ir para o início" className="flex min-w-0 items-center gap-2.5">
        {logo && !logoFailed ? (
          <img src={logo} alt={storeName} className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5" onError={() => setLogoFailed(true)} />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0094eb] text-xs font-black text-white">{initials(storeName)}</span>
        )}
        <span className="truncate text-sm font-bold text-slate-800">{storeName}</span>
      </Link>

      <div className="flex items-center gap-2">
        <MasterButton />
        {actions}
        <div className="flex items-center gap-2"><ClearCacheButton /><ModuleSwitcher /></div>

        <div ref={ref} className="relative">
          <button
            type="button"
            aria-label="Menu da conta"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
          >
            <User className="h-4 w-4" />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <p className="truncate px-3 py-2 text-xs font-bold text-slate-500">{storeName}</p>
              <button type="button" className={item} onClick={() => go('/dashboard/settings')}><Settings className="h-4 w-4" /> Configurações</button>
              <button type="button" className={item} onClick={() => go('/dashboard/assinaturas')}><CreditCard className="h-4 w-4" /> Assinatura e planos</button>
              <button type="button" className={`${item} text-rose-600 hover:bg-rose-50`} onClick={() => { setOpen(false); void signOut(); }}>
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