import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import PlatformConnectCard from '@/components/configuracoes/PlatformConnectCard';
import YampiWebhookCard from '@/components/integrations/YampiWebhookCard';
import { getYampiStatus } from '@/services/yampiService';
import { SocialIntegrationsCard } from "@/components/integracao/SocialIntegrationsCard";

const H2 = 'text-base font-black uppercase tracking-tight text-slate-900 dark:text-white';

export default function IntegracoesPage() {
  const { storeId } = useLoja();
  const [yampiOn, setYampiOn] = useState(false);

  useEffect(() => {
    if (!storeId || yampiOn) return;
    let alive = true;
    const check = () => {
      getYampiStatus(storeId)
        .then((s) => { if (alive && s.connected) setYampiOn(true); })
        .catch(() => { /* sem status */ });
    };
    check();
    const t = window.setInterval(check, 4000);
    return () => { alive = false; window.clearInterval(t); };
  }, [storeId, yampiOn]);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('yampi-sync', { body: { store_id: storeId, ...body } });
    if (error) throw error;
    return data;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Integrações</h1>
          <p className="mt-1 text-sm text-slate-500">Conecte sua plataforma de e-commerce e suas redes sociais ao SLL.</p>
        </div>

        {!storeId ? (
          <p className="text-sm text-slate-500">Carregando loja...</p>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className={H2}>Plataformas de e-commerce</h2>
              <PlatformConnectCard storeId={storeId} platform="Yampi" platforms={['Yampi']} onChangePlatform={() => {}} />
              {yampiOn && <YampiWebhookCard storeId={storeId} call={call} />}
            </section>

            <section className="space-y-4">
              <h2 className={H2}>Redes sociais</h2>
              <SocialIntegrationsCard storeId={storeId} />
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}