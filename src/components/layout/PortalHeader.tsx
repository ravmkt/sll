import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lightbulb, LayoutDashboard, Package, Plug, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import DashboardNotice from '@/components/dashboard/DashboardNotice';

const sb: any = supabase;

const TABS = [
  { label: 'Visão Geral', to: '/dashboard', icon: LayoutDashboard, match: (p: string) => p === '/dashboard' },
  { label: 'Produtos & Catálogo', to: '/dashboard/produtos', icon: Package, match: (p: string) => p.startsWith('/dashboard/produtos') || p.startsWith('/dashboard/medidas') },
  { label: 'Insights do Noah', to: '/dashboard/dicas', icon: Lightbulb, match: (p: string) => p.startsWith('/dashboard/dicas') },
  { label: 'Instalação & Script', to: '/dashboard/integracao', icon: Plug, match: (p: string) => p.startsWith('/dashboard/integracao') },
  { label: 'Configurações', to: '/dashboard/settings', icon: Settings, match: (p: string) => p.startsWith('/dashboard/settings') },
];

const initials = (name: string) =>
  (name || 'Loja').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'L';

export default function PortalHeader() {
  const { pathname } = useLocation();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.from('store_settings').select('logo_url,store_name').eq('store_id', storeId).maybeSingle()
      .then(({ data }: any) => {
        if (!alive) return;
        setLogo(((data?.logo_url as string) || store?.logo_url || '').trim() || null);
        setName(((data?.store_name as string) || '').trim());
        setImgFailed(false);
      });
    return () => { alive = false; };
  }, [storeId, store?.logo_url]);

  const storeName = name || store?.name || 'sua loja';

  return (
    <div className="space-y-4">
      {pathname === '/dashboard' && <DashboardNotice storeId={storeId} />}

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        {logo && !imgFailed ? (
          <img src={logo} alt={storeName} className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1" onError={() => setImgFailed(true)} />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0094eb] to-[#0073c7] text-lg font-black text-white shadow-sm">
            {initials(storeName)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-slate-900">Bem-vindo(a), {storeName}</h1>
          <p className="text-sm text-slate-500">Painel de controle e inteligência da sua operação online.</p>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'border-[#0094eb] text-[#0094eb]' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}