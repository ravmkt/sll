import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import DashboardNotice from '@/components/dashboard/DashboardNotice';

const sb: any = supabase;

// Para novos modulos (ex.: Juridico), basta incluir uma entrada aqui
const MODULES = {
  vidlytics: {
    location: 'vidlytics' as const,
    title: 'Seus vídeos vendendo por você',
    subtitle: (n: string) => `Olá, ${n}. Acompanhe o desempenho dos seus vídeos e o impacto nas vendas.`,
  },
  live: {
    location: 'live' as const,
    title: 'Sua próxima live vende mais',
    subtitle: (n: string) => `Olá, ${n}. Acompanhe suas lives, o engajamento e as vendas.`,
  },
};

export type ModuleHeaderKey = keyof typeof MODULES;

const initials = (name: string) =>
  (name || 'Loja').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'L';

export default function ModuleHeader({ module }: { module: ModuleHeaderKey }) {
  const cfg = MODULES[module];
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.from('stores').select('contact_name').eq('id', storeId).maybeSingle()
      .then(({ data }: any) => { if (alive) setContact(((data?.contact_name as string) || '').trim()); });
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
  const greetName = (contact || String(store?.contact_name || '')).trim().split(/\s+/)[0] || storeName;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch 2xl:grid-cols-5">
      <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm lg:col-span-1 2xl:col-span-2 [&:has(+div:empty)]:!col-span-full">
        {logo && !imgFailed ? (
          <img src={logo} alt={storeName} className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1" onError={() => setImgFailed(true)} />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0094eb] to-[#0073c7] text-lg font-black text-white shadow-sm">
            {initials(storeName)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-800">{cfg.title}</h1>
          <p className="text-sm text-slate-500">{cfg.subtitle(greetName)}</p>
        </div>
      </div>
      <div className="min-w-0 empty:hidden lg:col-span-1 2xl:col-span-3">
        <DashboardNotice storeId={storeId} location={cfg.location} />
      </div>
    </div>
  );
}