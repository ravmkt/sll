import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTryOnStore } from './hooks/useTryOnStore';

const VisaoGeralTab = lazy(() => import('./tabs/VisaoGeralTab'));
const AparenciaTab = lazy(() => import('./tabs/AparenciaTab'));

const TABS = [
  { key: 'geral', label: 'Visão Geral' },
  { key: 'aparencia', label: 'Aparência' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'insights', label: 'Insights' },
  { key: 'instalacao', label: 'Instalação' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function TryOnModule() {
  const [params, setParams] = useSearchParams();
  const { store, loading, error } = useTryOnStore();
  const raw = params.get('tab') as TabKey | null;
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : 'geral';

  const renderTab = () => {
    if (loading) return <div className="text-sm text-slate-500">Carregando loja...</div>;
    if (error || !store) {
      return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? 'Loja não encontrada.'}</div>;
    }
    if (tab === 'geral') return <VisaoGeralTab storeId={store.id} onGoTab={(t) => setParams({ tab: t })} />;
    if (tab === 'aparencia') return <AparenciaTab />;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Aba "{TABS.find((t) => t.key === tab)?.label}" em construção.
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <h1 className="text-xl font-bold text-slate-900">Try-On</h1>
      <p className="mb-4 text-sm text-slate-500">Provador virtual da sua loja</p>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams({ tab: t.key })}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-[#0094eb] text-[#0094eb]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Suspense fallback={null}>{renderTab()}</Suspense>
    </div>
  );
}