import { useState } from 'react';
import { Package, Search } from 'lucide-react';
import { Card, EmptyState, ErrorBox, SectionTitle, Skeleton } from '@/components/radar/RadarUI';
import { useActiveStore } from '@/hooks/radar/useRadarStore';
import { useAsync } from '@/hooks/radar/useAsync';
import { listProducts } from '@/services/radar/products';
import type { StoreProduct } from '@/types/radar';

const PAGE = 10;

export default function ProductsPage() {
  const store = useActiveStore();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<StoreProduct | null>(null);
  const { data, loading, error } = useAsync(() => listProducts(store.id, q, page, PAGE), [store.id, q, page]);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));

  return (
    <>
      <SectionTitle>Produtos (IA)</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Buscar produto" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
          </div>
          {error && <ErrorBox message={error} />}
          {loading && <Skeleton className="h-40 w-full" />}
          {data && data.items.length === 0 && <Card><EmptyState title="Nenhum produto encontrado" /></Card>}
          <div className="space-y-2">
            {data?.items.map((p) => (
              <button key={p.id} type="button" onClick={() => setSel(p)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${sel?.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><Package className="h-5 w-5 text-slate-400" /></div>}
                <div className="min-w-0"><div className="truncate text-sm font-medium">{p.name}</div><div className="text-xs text-slate-400">{p.sku ?? 'Sem SKU'}</div></div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <button type="button" disabled={page === 0} onClick={() => setPage((x) => x - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-40">Anterior</button>
            <span>{page + 1} / {pages}</span>
            <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((x) => x + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-40">Próxima</button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!sel ? (
            <Card><EmptyState title="Selecione um produto" hint="Veja o texto atual e, em breve, a sugestão da IA." /></Card>
          ) : (
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">{sel.name}</h3>
                <button type="button" disabled title="Disponível em um próximo passo" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-400">Gerar sugestão</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-slate-400">Atual</div>
                  <div className="min-h-24 whitespace-pre-line rounded-lg border bg-slate-50 p-3 text-sm">{sel.description ?? 'Sem descrição'}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-blue-600">Sugestão da IA</div>
                  <div className="flex min-h-24 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-500">Nenhuma sugestão gerada</div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-slate-600"><b>Por quê:</b> a explicação de cada mudança aparecerá aqui.</div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}