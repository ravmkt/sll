import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import DashboardNotice from '@/components/dashboard/DashboardNotice';
import NpsWizardGate from '@/components/feedback/NpsWizardGate';

const sb: any = supabase;

const initials = (name: string) =>
  (name || 'Loja').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'L';

export default function PortalHeader() {
  const { pathname } = useLocation();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imgFailed, setImgFailed] = useState(false);
  const [contact, setContact] = useState('');

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.from('stores').select('contact_name').eq('id', storeId).maybeSingle()
      .then(({ data }: any) => { if (alive) setContact(((data?.contact_name as string) || '').trim()); });
    return () => { alive = false; };
  }, [storeId]);

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

  if (pathname !== '/dashboard') return null;

  const storeName = name || store?.name || 'sua loja';
  const greetName = (contact || String(store?.contact_name || '')).trim().split(/\s+/)[0] || storeName;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
      <DashboardNotice storeId={storeId} />
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        {logo && !imgFailed ? (
          <img src={logo} alt={storeName} className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1" onError={() => setImgFailed(true)} />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0094eb] to-[#0073c7] text-lg font-black text-white shadow-sm">
            {initials(storeName)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-slate-900">Bem-vindo(a), {greetName}</h1>
          <p className="text-sm text-slate-500">Painel de controle e inteligência da sua operação online.</p>
        </div>
      </div>
      </div>
      <div className="flex flex-col empty:hidden lg:w-64 lg:shrink-0">
        <NpsWizardGate />
      </div>
    </div>
  );
}