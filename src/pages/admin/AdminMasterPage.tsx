import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModulosTab from '@/components/admin/ModulosTab';
import PrecosTab from '@/components/admin/PrecosTab';
import { MasterLayout, type MasterTab } from '@/components/admin/MasterLayout';
import DashboardTab from '@/components/admin/DashboardTab';
import LojasTab from '@/components/admin/LojasTab';
import MarketingTab from '@/components/admin/MarketingTab';
import BenchmarkUpdateCard from '@/components/admin/BenchmarkUpdateCard';

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
        <div className="space-y-5">
          <BenchmarkUpdateCard />
        </div>
      )}
    </MasterLayout>
  );
}
