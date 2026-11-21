import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { exportCustomersXlsx } from '../services/clientesExport';
import type { ExportFilters } from '../services/clientesExport';

type Props = { storeId: string; filters?: ExportFilters; className?: string };

export default function ExportCustomersButton({ storeId, filters, className }: Props) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const n = await exportCustomersXlsx(storeId, filters);
      if (n === 0) showError('Nenhum cliente para exportar.');
      else showSuccess(`${n} cliente(s) exportado(s).`);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao exportar clientes.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void run()}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--sll-b-bd-200)] bg-[color:var(--sll-b-bg-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--sll-b-tx-700)] transition hover:bg-[color:var(--sll-b-bg-hover)] disabled:opacity-50',
        className,
      )}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      Exportar
    </button>
  );
}