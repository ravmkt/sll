import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { listVariants, type Variant } from '@/services/productVariantsService';
import { syncYampi } from '@/services/yampiSyncService';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

const brl = (n: number | null) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type ProductRef = { id: string; name: string; origin?: string | null };
type PanelProps = { product: ProductRef; storeId: string; onChanged?: () => void };

export function VariantsPanel({ product, storeId, onChanged }: PanelProps) {
  const [rows, setRows] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await listVariants(product.id)); }
    catch { showError('Erro ao carregar variações.'); }
    finally { setLoading(false); }
  }, [product.id]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const sync = async () => {
    setBusy(true);
    try {
      await syncYampi(storeId, product.id);
      await load();
      onChanged?.();
      showSuccess('Produto sincronizado com a Yampi.');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao sincronizar.');
    } finally {
      setBusy(false);
    }
  };

  const total = rows.reduce((s, v) => s + Number(v.stock || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">
          {rows.length} {rows.length === 1 ? 'variação' : 'variações'} · estoque total{' '}
          <span className="font-bold text-slate-800 dark:text-white">{total}</span>
        </p>
        {product.origin === 'yampi' && (
          <button type="button" onClick={sync} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-[#0094eb] px-3 py-1.5 text-[11px] font-bold uppercase text-[#0094eb] hover:bg-[#0094eb]/10 disabled:opacity-50 cursor-pointer">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sincronizar produto
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#0094eb]" /></div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">Este produto não tem variações cadastradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2">Variação</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2 text-right">Preço</th>
                <th className="px-3 py-2 text-right">Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-700 dark:text-white">{v.option_value || v.title || '—'}</p>
                    {v.option_name && <p className="text-[10px] text-slate-400">{v.option_name}</p>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{v.sku}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {v.sale_price ? (<><span className="mr-1 text-[10px] text-slate-400 line-through">{brl(v.price)}</span>{brl(v.sale_price)}</>) : brl(v.price)}
                  </td>
                  <td className={cn('px-3 py-2 text-right font-mono font-bold', Number(v.stock) > 0 ? 'text-slate-700 dark:text-white' : 'text-rose-600')}>{v.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type ModalProps = PanelProps & { onClose: () => void };

export default function ProductVariantsModal({ product, storeId, onChanged, onClose }: ModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white dark:bg-[#1a1f35] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Estoque e variações</h3>
            <p className="text-xs text-slate-500">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <VariantsPanel product={product} storeId={storeId} onChanged={onChanged} />
      </div>
    </div>,
    document.body,
  );
}