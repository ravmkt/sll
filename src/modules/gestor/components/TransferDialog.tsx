import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { transferStock, variantWarehouseStock } from '../services/estoqueCanais';
import type { VariantWhStock } from '../services/estoqueCanais';

type Props = {
  variant: { id: string; label: string; sku: string };
  onClose: () => void;
  onDone: () => void;
};

export default function TransferDialog({ variant, onClose, onDone }: Props) {
  const [rows, setRows] = useState<VariantWhStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    variantWarehouseStock(variant.id)
      .then((r) => {
        setRows(r);
        const src = r.find((x) => x.qty > 0) ?? r[0];
        setFrom(src?.warehouse_id ?? '');
        setTo(r.find((x) => x.warehouse_id !== src?.warehouse_id)?.warehouse_id ?? '');
      })
      .catch((e) => showError((e as Error).message))
      .finally(() => setLoading(false));
  }, [variant.id]);

  const balance = rows.find((r) => r.warehouse_id === from)?.qty ?? 0;
  const n = qty === '' ? 0 : Number(qty);

  const submit = async () => {
    if (!from || !to || from === to) { showError('Escolha origem e destino diferentes.'); return; }
    if (!Number.isInteger(n) || n <= 0) { showError('Informe uma quantidade inteira maior que zero.'); return; }
    if (n > balance) { showError(`A origem só tem ${balance} un.`); return; }
    setBusy(true);
    try {
      await transferStock(variant.id, from, to, n, note.trim());
      showSuccess('Transferência registrada no histórico.');
      onDone();
      onClose();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Transferir entre depósitos" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        <div>
          <p className="truncate text-sm font-semibold">{variant.label}</p>
          <p className="text-[11px] text-slate-400">SKU {variant.sku}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : rows.length < 2 ? (
          <p className="py-4 text-center text-sm text-slate-400">É preciso ter ao menos dois depósitos ativos. Crie em Canais e depósitos.</p>
        ) : (
          <>
            <ul className="divide-y rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
              {rows.map((r) => (
                <li key={r.warehouse_id} className="flex items-center justify-between px-3 py-2">
                  <span>{r.name}</span><span className="font-mono font-bold">{r.qty}</span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                De
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls + ' mt-1 cursor-pointer font-normal'}>
                  {rows.map((r) => <option key={r.warehouse_id} value={r.warehouse_id}>{r.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Para
                <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls + ' mt-1 cursor-pointer font-normal'}>
                  {rows.map((r) => <option key={r.warehouse_id} value={r.warehouse_id}>{r.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Quantidade (máx. {balance})
                <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} className={inputCls + ' mt-1 font-mono font-normal'} />
              </label>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Motivo (opcional)
                <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls + ' mt-1 font-normal'} />
              </label>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancelar</button>
          <button type="button" disabled={busy || loading || rows.length < 2} onClick={() => void submit()} className={primaryBtn + ' disabled:opacity-50'}>
            {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}Transferir
          </button>
        </div>
      </div>
    </Modal>
  );
}