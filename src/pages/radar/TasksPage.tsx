import { useState } from 'react';
import { Badge, Card, EmptyState, ErrorBox, SectionTitle, Skeleton } from '@/components/radar/RadarUI';
import { useActiveStore } from '@/hooks/radar/useRadarStore';
import { useAsync } from '@/hooks/radar/useAsync';
import { listTasks } from '@/services/radar/tasks';
import type { Priority } from '@/types/radar';

const filters: (Priority | 'todas')[] = ['todas', 'alta', 'media', 'baixa'];
const tone = { alta: 'red', media: 'amber', baixa: 'slate' } as const;

export default function TasksPage() {
  const store = useActiveStore();
  const [f, setF] = useState<Priority | 'todas'>('todas');
  const { data, loading, error } = useAsync(() => listTasks(store.id, f), [store.id, f]);
  return (
    <>
      <SectionTitle>Tarefas</SectionTitle>
      <div className="flex gap-2 text-sm">
        {filters.map((x) => (
          <button key={x} type="button" onClick={() => setF(x)} className={`rounded-lg px-3 py-1.5 capitalize ${f === x ? 'bg-blue-600 font-medium text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{x}</button>
        ))}
      </div>
      {error && <ErrorBox message={error} />}
      {loading && <Skeleton className="h-20 w-full" />}
      {data && data.length === 0 && <Card><EmptyState title="Nenhuma tarefa por aqui" hint="As tarefas aparecem depois do diagnóstico." /></Card>}
      <div className="space-y-3">
        {data?.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-3 p-4">
            <div><div className="text-sm font-medium">{t.title}</div><div className="text-xs text-slate-400">{t.category}</div></div>
            <Badge tone={tone[t.priority]}>{t.priority}</Badge>
          </Card>
        ))}
      </div>
    </>
  );
}