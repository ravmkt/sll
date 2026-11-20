import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { pushStockToYampi } from '@/modules/gestor/services/gestor';
import { Modal, errMsg, inputCls, primaryBtn } from './Modal';
import { variantLabel, type VariantRow } from './variantsData';

const sb: any = supabase;

type Props = {
  storeId: string;
  product: { id: string; name: string; origin?: string | null };
  variants: VariantRow[];
  onSaved: () => Promise<void> | void;
  onClose: () => void;
};

export default function StockEditDialog({ storeId, product, variants, onSaved, onClose }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(variants.map((v) => [v.id, String(v.stock)])));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const changed = variants.filter((v) => vals[v.id] !== String(v.stock));

  const save = async () => {
    for (const v of changed) {
      const n = Number(vals[v.id]);
      if (!Number.isInteger(n) || n < 0) { showError(`Estoque inválido em ${variantLabel(v)}. Use inteiro, zero ou maior.`); return; }
    }
    setBusy(true);
    let ok = 0;
    let pushFailed = false;
    try {
      for (const v of changed) {
        const target = Number(vals[v.id]);
        const delta = target - v.stock;
        if (delta === 0) continue;
        try {
          await sb.from('product_variants').update({ sync_hold_until: new Date(Date.now() + 60000).toISOString() }).eq('id', v.id);
        } catch { /* sem trava de eco: segue */ }
        const { data: balance, error } = await sb.rpc('gestor_stock_move', {
          p_variant: v.id, p_type: 'adjustment', p_qty: delta, p_note: note.trim() || 'Ajuste pela lista de produtos',
        });
        if (error) throw new Error(`${variantLabel(v)}: ${error.message}`);
        ok++;
        if (product.origin === 'yampi') {
          const r: unknown = await pushStockToYampi(storeId, v.sku, Number(balance ?? target));
          if (r === 'erro') pushFailed = true;
        }
      }
      showSuccess(ok ? `${ok} variação(ões) atualizada(s).${pushFailed ? ' ERP salvo, mas o envio à Yampi falhou.' : ''}` : 'Nada para salvar.');
      await onSaved();
      onClose();
    } catch (e) {
      showError(errMsg(e));
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Estoque: ${product.name}`} onClose={onClose}>
      <div className="space-y-4 p-6">
        {variants.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Este produto não tem variações com estoque controlado.</p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {variants.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-[#111524]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-white">{variantLabel(v)}</p>
                  <p className="text-[11px] text-slate-400">SKU {v.sku} · atual {v.stock}</p>
                </div>
                <input
                  type="number" min={0} step={1} value={vals[v.id] ?? ''}
                  onChange={(e) => setVals((p) => ({ ...p, [v.id]: e.target.value }))}
                  className={inputCls + ' !w-24 text-center font-mono'}
                />
              </div>
            ))}
          </div>
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo (opcional)" className={inputCls} />
        <p className="text-[11px] text-slate-400">Cada alteração entra no Livro de estoque como ajuste, no depósito do e-commerce.{product.origin === 'yampi' ? ' O novo saldo também é enviado à Yampi.' : ''}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancelar</button>
          <button type="button" disabled={busy || changed.length === 0} onClick={() => void save()} className={primaryBtn + ' disabled:opacity-50'}>
            {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}Salvar{changed.length ? ` (${changed.length})` : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
}