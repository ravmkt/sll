import { Printer, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { Paper } from '../offline/receiptConfig';

interface Props {
  online: boolean;
  pending: number;
  syncing: boolean;
  expired: boolean;
  lastError: string | null;
  paper: Paper;
  onPaper: (p: Paper) => void;
  onSync: () => void;
  canSync?: boolean;
}

export default function PdvStatusBar({ online, pending, syncing, expired, lastError, paper, onPaper, onSync, canSync }: Props) {
  const tone = !online
    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
    : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2 text-xs font-medium ${tone}`}>
      <span className="inline-flex items-center gap-1.5">
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        {online ? 'Online' : 'Offline: vendas ficam salvas neste computador'}
      </span>

      {pending > 0 && <span>{pending} pendente(s) de envio</span>}
      {expired && <span className="font-semibold text-red-600 dark:text-red-400">Offline há mais de 3 dias: conecte à internet</span>}
      {lastError && <span className="text-red-600 dark:text-red-400" title={lastError}>Último erro: {lastError.slice(0, 60)}</span>}

      <div className="ml-auto flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5">
          <Printer size={14} />
          <select
            value={paper}
            onChange={(e) => onPaper(e.target.value as Paper)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="58">Térmica 58 mm</option>
            <option value="80">Térmica 80 mm</option>
            <option value="a4">A4</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onSync}
          disabled={!(canSync ?? online) || syncing}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[color:var(--sll-b-brand)] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[color:var(--sll-b-brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> Sincronizar
        </button>
      </div>
    </div>
  );
}