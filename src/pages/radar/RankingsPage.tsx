import { useState } from 'react';
import { Card, EmptyState, SectionTitle } from '@/components/radar/RadarUI';

const tabs = ['Palavras-chave', 'Páginas', 'Produtos'] as const;

export default function RankingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Palavras-chave');
  return (
    <>
      <SectionTitle>Rankings</SectionTitle>
      <div className="flex gap-2 text-sm">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 ${tab === t ? 'bg-blue-600 font-medium text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{t}</button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr><th className="p-3">{tab.slice(0, -1)}</th><th>Posição</th><th>Variação</th><th>Impressões</th><th>Cliques</th></tr>
          </thead>
        </table>
        <EmptyState title="Sem dados anteriores" hint="Conecte o Search Console para acompanhar seus rankings." />
      </Card>
    </>
  );
}