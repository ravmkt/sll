import { Badge, Card, ErrorBox, SectionTitle, Skeleton } from '@/components/radar/RadarUI';
import { useActiveStore } from '@/hooks/radar/useRadarStore';
import { useAsync } from '@/hooks/radar/useAsync';
import { listConnections } from '@/services/radar/connections';
import type { Provider } from '@/types/radar';

const providers: { id: Provider; name: string; desc: string; soon?: boolean }[] = [
  { id: 'gsc', name: 'Google Search Console', desc: 'Cliques, impressões e posição por busca.' },
  { id: 'ga4', name: 'Google Analytics 4', desc: 'Sessões, conversão e receita orgânica.' },
  { id: 'widget', name: 'Widget SLL (GTM)', desc: 'Schema, meta tags e FAQ injetados na loja.' },
  { id: 'gbp', name: 'Google Meu Negócio', desc: 'Ligações, rotas e avaliações.', soon: true },
  { id: 'meta', name: 'Instagram / Facebook', desc: 'Alcance e engajamento.', soon: true },
];

export default function ConnectionsPage() {
  const store = useActiveStore();
  const { data, loading, error } = useAsync(() => listConnections(store.id), [store.id]);
  const byProvider = new Map(data?.map((c) => [c.provider, c]));

  return (
    <>
      <SectionTitle>Conexões</SectionTitle>
      {error && <ErrorBox message={error} />}
      {loading && <Skeleton className="h-24 w-full" />}
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => {
          const c = byProvider.get(p.id);
          const status = c?.status ?? 'disconnected';
          return (
            <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500">{p.desc}</div>
                {c?.last_sync_at && <div className="mt-1 text-xs text-slate-400">Último sync: {new Date(c.last_sync_at).toLocaleString('pt-BR')}</div>}
              </div>
              {p.soon ? <Badge>Em breve</Badge> : status === 'connected' ? <Badge tone="green">Conectado</Badge> : (
                <button type="button" disabled title="Disponível no próximo passo" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-400">Conectar</button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}