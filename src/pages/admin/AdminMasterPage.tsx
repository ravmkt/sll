import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModulosTab from '@/components/admin/ModulosTab';
import PrecosTab from '@/components/admin/PrecosTab';
import { Construction } from 'lucide-react';
import { MasterLayout, type MasterTab } from '@/components/admin/MasterLayout';
import DashboardTab from '@/components/admin/DashboardTab';
import LojasTab from '@/components/admin/LojasTab';
import MarketingTab from '@/components/admin/MarketingTab';

const SOON: Record<Exclude<MasterTab, 'dashboard' | 'lojas' | 'modulos' | 'precos' | 'marketing'>, { title: string; etapa: string }> = {
  insights: { title: 'Insights', etapa: 'Etapa 6' },
};

export default function AdminMasterPage() {
  const [, setParams] = useSearchParams();
  const [planModule, setPlanModule] = useState<string | null>(null);
  const [tab, setTab] = useState<MasterTab>(() => { const t = new URLSearchParams(window.location.search).get('tab') as MasterTab | null; return t && ['dashboard','lojas','modulos','precos','marketing','insights'].includes(t) ? t : 'dashboard'; });

  return (
    <MasterLayout tab={tab} onTab={setTab}>
      {tab === 'dashboard' ? (
        <DashboardTab />
      ) : tab === 'lojas' ? (
        <LojasTab />
      ) : tab === 'marketing' ? (
            <MarketingTab />
          ) : tab === 'precos' ? (
        <PrecosTab initialModule={planModule} />
      ) : tab === 'modulos' ? (
        <ModulosTab onOpenPlans={(slug) => { setPlanModule(slug); setTab('precos'); }} onOpenStore={(id) => { setParams({ tab: 'lojas', loja: id }); setTab('lojas'); }} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#111524] py-24 text-center">
          <Construction className="mb-3 h-9 w-9 text-[#fd8539]" />
          <h2 className="text-lg font-bold text-white">{SOON[tab].title}</h2>
          <p className="mt-1 text-sm text-slate-500">Em construção ({SOON[tab].etapa}).</p>
        </div>
      )}
    </MasterLayout>
  );
}