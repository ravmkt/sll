import { useState } from 'react';
import { Radar } from 'lucide-react';
import { Card, EmptyState, ErrorBox, HealthRing, PeriodSelector, SectionTitle, Skeleton, StatCard, type Period, Badge } from '@/components/radar/RadarUI';
import { useActiveStore, useRadarCtx } from '@/hooks/radar/useRadarStore';
import { useAsync } from '@/hooks/radar/useAsync';
import { getSettings } from '@/services/radar/settings';
import { listTasks } from '@/services/radar/tasks';

const stats = ['Cliques', 'Impressões', 'Posição média', 'Sessões orgânicas', 'Receita orgânica', 'Conversão orgânica'];
const tone = { alta: 'red', media: 'amber', baixa: 'slate' } as const;

export default function OverviewPage() {
  const store = useActiveStore();
  const { userName } = useRadarCtx();
  const [period, setPeriod] = useState<Period>('30d');
  const settings = useAsync(() => getSettings(store.id), [store.id]);
  const tasks = useAsync(() => listTasks(store.id, 'todas', 5), [store.id]);

  return (
    <>
      <Card className="flex items-center gap-4 p-5">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50"><Radar className="h-7 w-7 text-blue-600" /></div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sua loja sendo encontrada</h1>
          <p className="text-sm text-slate-500">Olá, {userName}. Acompanhe sua presença no Google, no Maps e nas IAs.</p>
        </div>
      </Card>

      <section>
        <SectionTitle>Nota de saúde SEO</SectionTitle>
        <Card className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          {settings.loading ? <Skeleton className="h-32 w-32 rounded-full" /> : <HealthRing score={settings.data?.health_score ?? null} />}
          <div className="text-center sm:text-left">
            <div className="text-sm font-semibold text-slate-800">
              {settings.data?.health_score == null ? 'Rode o diagnóstico' : 'Saúde atual da sua loja'}
            </div>
            <p className="mt-1 text-xs text-slate-400">O diagnóstico automático será liberado nos próximos passos.</p>
            <button type="button" disabled className="mt-3 cursor-not-allowed rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">Rodar diagnóstico</button>
          </div>
        </Card>
        {settings.error && <div className="mt-3"><ErrorBox message={settings.error} /></div>}
      </section>

      <section>
        <SectionTitle right={<PeriodSelector value={period} onChange={setPeriod} />}>Desempenho na busca</SectionTitle>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((l) => <StatCard key={l} label={l} value="--" />)}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-bold uppercase tracking-wide text-slate-700">Share of Voice em IA</div>
          <EmptyState title="Sem dados anteriores" hint="Disponível quando o monitor de IA for ativado." />
        </Card>
        <Card className="p-5">
          <div className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Próximas tarefas</div>
          {tasks.loading && <Skeleton className="h-16 w-full" />}
          {tasks.error && <ErrorBox message={tasks.error} />}
          {tasks.data && tasks.data.length === 0 && <EmptyState title="Nenhuma tarefa aberta" />}
          <ul className="space-y-2">
            {tasks.data?.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                <span>{t.title}</span><Badge tone={tone[t.priority]}>{t.priority}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}