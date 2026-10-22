import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModulosTab from '@/components/admin/ModulosTab';
import PrecosTab from '@/components/admin/PrecosTab';
import TrialSettingsCard from '@/components/admin/TrialSettingsCard';
import { MasterLayout, type MasterTab } from '@/components/admin/MasterLayout';
import DashboardTab from '@/components/admin/DashboardTab';
import LojasTab from '@/components/admin/LojasTab';
import MarketingTab from '@/components/admin/MarketingTab';
import NoahPage from '@/components/admin/NoahPage'; import SaquesTab from '@/components/admin/SaquesTab';
import BenchmarkUpdateCard from '@/components/admin/BenchmarkUpdateCard';

export default function AdminMasterPage() {
  const [, setParams] = useSearchParams();
  const [planModule, setPlanModule] = useState<string | null>(null);
  const [tab, setTab] = useState<MasterTab>(() => { const t = new URLSearchParams(window.location.search).get('tab') as MasterTab | null; return t && ['dashboard','lojas','modulos','precos','marketing','noah','insights','saques'].includes(t) ? t : 'dashboard'; });
  // Sempre abre a aba no topo da pagina
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [tab]);

  const goTab = (t: MasterTab) => { setTab(t); setParams({ tab: t }); };

  return (
    <MasterLayout tab={tab} onTab={goTab}>
      {tab === 'dashboard' ? (
        <DashboardTab />
      ) : tab === 'lojas' ? (
        <LojasTab />
      ) : tab === 'noah' ? (
<NoahPage />
) : tab === 'saques' ? (<SaquesTab />) : tab === 'marketing' ? (
        <MarketingTab />
      ) : tab === 'precos' ? (
        <><TrialSettingsCard /><PrecosTab initialModule={planModule} /></>
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
