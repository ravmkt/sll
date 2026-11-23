import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface NcmSyncResult {
  total_yampi: number;
  com_ncm: number;
  variantes_casadas: number;
  produtos_atualizados: number;
  variantes_atualizadas: number;
}

export async function syncYampiNcm(storeId: string, overwrite = true): Promise<NcmSyncResult> {
  const { data, error } = await sb.functions.invoke('yampi-import', { body: { action: 'ncm', store_id: storeId } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  const items = data?.items ?? [];
  const { data: r, error: e2 } = await sb.rpc('gestor_apply_yampi_ncm', {
    p_store: storeId, p_items: items, p_overwrite: overwrite,
  });
  if (e2) throw new Error(e2.message);
  return { total_yampi: Number(data?.total || 0), com_ncm: items.length, ...(r || {}) } as NcmSyncResult;
}