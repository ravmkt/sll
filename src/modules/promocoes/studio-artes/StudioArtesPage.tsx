import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { listProducts, CatalogProduct } from '@/services/productsService';
import { getMyStore, StudioStore, CampaignRow } from './studioService';
import CampaignList from './CampaignList';
import CampaignEditor from './CampaignEditor';
import { CARD } from './ui';

type View =
  | { kind: 'list' }
  | { kind: 'editor'; mode: 'new' | 'edit' | 'reuse'; campaign?: CampaignRow };

export default function StudioArtesPage() {
  const [store, setStore] = useState<StudioStore | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>({ kind: 'list' });

  useEffect(() => {
    (async () => {
      try {
        const st = await getMyStore();
        if (!st) throw new Error('Loja não encontrada para o usuário logado.');
        setStore(st);
        setProducts(await listProducts(st.id));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className={`${CARD} flex items-center justify-center gap-3 py-16 text-sm text-slate-500`}>
        <Loader2 size={20} className="animate-spin text-[color:var(--sll-b-brand)]" /> Carregando...
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error || 'Loja não encontrada.'}</span>
      </div>
    );
  }

  if (view.kind === 'editor') {
    return (
      <CampaignEditor
        key={`${view.mode}-${view.campaign?.id ?? 'new'}`}
        store={store}
        products={products}
        mode={view.mode}
        campaign={view.campaign}
        onBack={() => setView({ kind: 'list' })}
      />
    );
  }

  return (
    <CampaignList
      storeId={store.id}
      onNew={() => setView({ kind: 'editor', mode: 'new' })}
      onEdit={(c) => setView({ kind: 'editor', mode: 'edit', campaign: c })}
      onReuse={(c) => setView({ kind: 'editor', mode: 'reuse', campaign: c })}
    />
  );
}