import { useState } from 'react';
import { Construction } from 'lucide-react';
import { MasterLayout, type MasterTab } from '@/components/admin/MasterLayout';
import DashboardTab from '@/components/admin/DashboardTab';

const SOON: Record<Exclude<MasterTab, 'dashboard'>, { title: string; etapa: string }> = {
  lojas: { title: 'Lojas', etapa: 'Etapa 3' },
  modulos: { title: 'Módulos', etapa: 'Etapa 4' },
  precos: { title: 'Preços', etapa: 'Etapa 4' },
  marketing: { title: 'Marketing', etapa: 'Etapa 5' },
  insights: { title: 'Insights', etapa: 'Etapa 6' },
};

export default function AdminMasterPage() {
  const [tab, setTab] = useState<MasterTab>('dashboard');

  return (
    <MasterLayout tab={tab} onTab={setTab}>
      {tab === 'dashboard' ? (
        <DashboardTab />
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