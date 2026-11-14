import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';
import WidgetsModule from './widgets/WidgetsModule';

export default function PulseWidgetsTab() {
  const { store, storeId: ctxStoreId, loading } = useLoja();
  const storeId: string = ctxStoreId ?? store?.id ?? '';
  const storeUrl: string = store?.store_url ?? store?.url ?? '';
  const storeName: string = store?.name ?? '';

  if (loading || !storeId) {
    return <div className="p-8 text-sm text-slate-500">Carregando loja...</div>;
  }
  return <WidgetsModule ctx={{ supabase, storeId, storeUrl, storeName }} />;
}