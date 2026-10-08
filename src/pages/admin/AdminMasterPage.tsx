import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModulosTab from '@/components/admin/ModulosTab';
import { Construction } from 'lucide-react';
import { MasterLayout, type MasterTab } from '@/components/admin/MasterLayout';
import DashboardTab from '@/components/admin/DashboardTab';
import LojasTab from '@/components/admin/LojasTab';

const SOON: Record<Exclude<MasterTab, 'dashboard' | 'lojas' | 'modulos'>, { title: string; etapa: string }> = {
  precos: { title: 'Preços', etapa: 'Etapa 4' },
  marketing: { title: 'Marketing', etapa: 'Etapa 5' },
  insights: { title: 'Insights', etapa: 'Etapa 6' },
};

export default function AdminMasterPage() {
  const [, setParams] = useSearchParams();
  const [tab, setTab] = useState<MasterTab>(() => { const t = new URLSearchParams(window.location.search).get('tab') as MasterTab | null; return t && ['dashboard','lojas','modulos','precos','marketing','insights'].includes(t) ? t : 'dashboard'; });

  return (
    <MasterLayout tab={tab} onTab={setTab}>
      {tab === 'dashboard' ? (
        <DashboardTab />
      ) : tab === 'lojas' ? (
        <LojasTab />
      ) : tab === 'modulos' ? (
        <ModulosTab onOpenStore={(id) => { setParams({ tab: 'lojas', loja: id }); setTab('lojas'); }} />
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