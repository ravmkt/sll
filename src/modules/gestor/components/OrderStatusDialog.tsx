import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { FULFILLMENT_LABEL } from '../services/pedidos';
import { setStatusMany } from '../services/pedidosBulk';
import type { BulkStatus } from '../services/pedidosBulk';
import OrderStatusBadge from './OrderStatusBadge';

const OPTIONS: BulkStatus[] = ['pending', 'separating', 'shipped', 'delivered'];

type Props = { ids: string[] | null; onClose: () => void; onDone: () => void };

export default function OrderStatusDialog({ ids, onClose, onDone }: Props) {
  const [status, setStatus] = useState<BulkStatus>('separating');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ids) setStatus('separating'); }, [ids]);

  const submit = async () => {
    if (!ids?.length) return;
    setBusy(true);
    try {
      const r = await setStatusMany(ids, status);
      if (r.ok) showSuccess(`${r.ok} pedido(s) alterado(s) para "${FULFILLMENT_LABEL[status]}".`);
      if (r.failed) showError(`${r.failed} pedido(s) não alterado(s): ${r.reason}`);
      onDone();
      onClose();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SllModal
      open={!!ids}
      onOpenChange={(o) => { if (!o && !busy) onClose(); }}
      title="Alterar status"
      size="md"
      footer={(
        <>
          <button type="button" disabled={busy} onClick={onClose} className={sllBtnGhost}>Cancelar</button>
          <button type="button" disabled={busy} onClick={() => void submit()} className={sllBtnPrimary}>
            {busy && <Loader2 size={15} className="animate-spin" />}Alterar
          </button>
        </>
      )}
    >
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Novo status para <strong>{ids?.length ?? 0}</strong> pedido(s). Pedidos cancelados não são alterados. Rastreio e observações já gravados são mantidos.
      </p>
      <div className="space-y-2">
        {OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'flex w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3 text-left transition dark:bg-slate-800',
              status === s ? 'border-[color:var(--sll-b-brand)] ring-2 ring-[color:var(--sll-b-brand-soft)]' : 'border-slate-200 hover:border-[color:var(--sll-b-brand)] dark:border-slate-700',
            )}
          >
            <OrderStatusBadge status={s} />
            {status === s && <span className="text-xs font-bold text-[color:var(--sll-b-brand)]">Selecionado</span>}
          </button>
        ))}
      </div>
    </SllModal>
  );
}