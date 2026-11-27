import { Download, Printer, RefreshCw, Wifi, WifiOff } from 'lucide-react';
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
  /** true = modo offline ligado pelo operador */
  manual?: boolean;
  onToggleManual?: () => void;
  onCheck?: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
  /** seletor de papel: so o gestor (a tela de Impressao nas Configuracoes vem depois) */
  showPaper?: boolean;
}

const pill = 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export default function PdvStatusBar({
  online, pending, syncing, expired, lastError, paper, onPaper, onSync, canSync,
  manual = false, onToggleManual, onCheck, canInstall = false, onInstall, showPaper = true,
}: Props) {
  const tone = !online
    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
    : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-1.5 text-xs font-medium ${tone}`}>
      <span className="inline-flex items-center gap-1.5">
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        {online ? 'Online' : manual ? 'Offline (modo manual): vendas ficam salvas neste computador' : 'Sem conexão: vendas ficam salvas neste computador'}
      </span>

      {pending > 0 && <span>{pending} pendente(s) de envio</span>}
      {expired && <span className="font-semibold text-red-600 dark:text-red-400">Offline há mais de 3 dias: conecte à internet</span>}
      {lastError && <span className="text-red-600 dark:text-red-400" title={lastError}>Último erro: {lastError.slice(0, 60)}</span>}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {onToggleManual && online && (
          <button
            type="button"
            onClick={onToggleManual}
            title="Internet instável? Salve as vendas neste computador e envie depois"
            className={pill + ' border-amber-300 bg-white text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300'}
          >
            <WifiOff size={13} /> Usar modo offline
          </button>
        )}
        {onToggleManual && !online && manual && (
          <button type="button" onClick={onToggleManual} className={pill + ' border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'}>
            <Wifi size={13} /> Voltar ao online
          </button>
        )}
        {!online && !manual && onCheck && (
          <button type="button" onClick={onCheck} className={pill + ' border-amber-300 bg-white text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300'}>
            <RefreshCw size={13} /> Testar conexão
          </button>
        )}

        {canInstall && onInstall && (
          <button
            type="button"
            onClick={onInstall}
            title="Instalar o PDV neste computador"
            className={pill + ' border-[color:var(--sll-b-brand-border)] bg-white text-[color:var(--sll-b-brand)] hover:bg-[color:var(--sll-b-brand-soft)] dark:bg-transparent'}
          >
            <Download size={13} /> Instalar app
          </button>
        )}

        {showPaper && (
          <label className="inline-flex items-center gap-1.5">
            <Printer size={14} />
            <select
              value={paper}
              onChange={(e) => onPaper(e.target.value as Paper)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="58">Térmica 58 mm</option>
              <option value="80">Térmica 80 mm</option>
              <option value="100">Etiqueta 100x150</option>
              <option value="a4">A4</option>
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={onSync}
          disabled={!(canSync ?? online) || syncing}
          className={pill + ' border-transparent bg-[color:var(--sll-b-brand)] text-white hover:bg-[color:var(--sll-b-brand-hover)]'}
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> Sincronizar
        </button>
      </div>
    </div>
  );
}