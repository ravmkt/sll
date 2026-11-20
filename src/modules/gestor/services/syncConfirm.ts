import { supabase } from '@/lib/supabase';

export type SyncResult = 'confirmed' | 'diverged' | 'skip' | 'error';
export interface SyncOutcome { sku: string; result: SyncResult; sent: number; remote: number | null; message: string }

export async function pushStockConfirmed(storeId: string, sku: string, stock: number): Promise<SyncOutcome> {
  const base = { sku, sent: stock, remote: null as number | null };
  try {
    const { data, error } = await supabase.functions.invoke('yampi-sync', {
      body: { action: 'push', store_id: storeId, sku, stock },
    });
    if (error) {
      let msg = '';
      try { msg = String((await (error as any).context.json())?.error || ''); } catch { /* sem corpo */ }
      msg = msg || error.message;
      if (/não conectada|sem external_id/i.test(msg)) {
        return { ...base, result: 'skip', message: 'SKU não existe na Yampi. Publique o produto no canal primeiro.' };
      }
      return { ...base, result: 'error', message: msg };
    }
    const remote = Number((data as any)?.after?.total_in_stock);
    if (!Number.isFinite(remote)) return { ...base, result: 'error', message: 'A Yampi não devolveu o saldo para conferência.' };
    if (remote !== Math.floor(stock)) {
      return { ...base, remote, result: 'diverged', message: `Enviado ${stock}, mas a Yampi mostra ${remote}.` };
    }
    return { ...base, remote, result: 'confirmed', message: 'Confirmado na Yampi.' };
  } catch (e) {
    return { ...base, result: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}