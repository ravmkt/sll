import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModulosTab from '@/components/admin/ModulosTab';
import PrecosTab from '@/components/admin/PrecosTab';
import { MasterLayout, type MasterTab } from '@/components/admin/MasterLayout';
import DashboardTab from '@/components/admin/DashboardTab';
import DashboardHealth from '@/components/admin/DashboardHealth';
import LojasTab from '@/components/admin/LojasTab';
import MarketingTab from '@/components/admin/MarketingTab';
import NoahSupportTab from '@/components/master/NoahSupportTab';
import BenchmarkUpdateCard from '@/components/admin/BenchmarkUpdateCard';

export default function AdminMasterPage() {
  const [, setParams] = useSearchParams();
  const [planModule, setPlanModule] = useState<string | null>(null);
  const [tab, setTab] = useState<MasterTab>(() => { const t = new URLSearchParams(window.location.search).get('tab') as MasterTab | null; return t && ['dashboard','lojas','modulos','precos','marketing','noah','insights'].includes(t) ? t : 'dashboard'; });

  const goTab = (t: MasterTab) => { setTab(t); setParams({ tab: t }); };

  return (
    <MasterLayout tab={tab} onTab={goTab}>
      {tab === 'dashboard' ? (
        <div className="space-y-6"><DashboardHealth /><DashboardTab /></div>
      ) : tab === 'lojas' ? (
        <LojasTab />
      ) : tab === 'noah' ? (
<NoahSupportTab />
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
