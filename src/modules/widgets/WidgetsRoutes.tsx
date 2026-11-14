import { useLoja } from '@/contexts/LojaContext';
import { supabase } from '@/lib/supabase';
import WidgetsModule from '@/modules/widgets/WidgetsModule';

export default function WidgetsRoutes() {
  const { store } = useLoja();
  const s = (store ?? null) as Record<string, unknown> | null;

  const storeId = (s?.id as string | undefined) ?? '';
  const storeUrl = (s?.store_url as string | undefined) ?? (s?.url as string | undefined) ?? '';

  if (!storeId) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando loja...
      </div>
    );
  }

  return (
    <WidgetsModule
      ctx={{
        supabase,
        storeId,
        storeUrl,
        basePath: '/dashboard/modules/widgets',
      }}
    />
  );
}
