import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { pushStockChecked } from '../services/gestor';
import type { PushResult } from '../services/gestor';

export type SyncJob = { sku: string; stock: number; label: string };

const CHANNELS = [
  { key: 'yampi', label: 'Yampi (e-commerce)', enabled: true },
  { key: 'nuvemshop', label: 'Nuvemshop (em breve)', enabled: false },
  { key: 'social', label: 'Redes sociais (em breve)', enabled: false },
];

type Props = { storeId: string; jobs?: SyncJob[]; onClose: () => void; onDone?: () => void };
type Out = { job: SyncJob; r: PushResult };

export default function SyncChannelModal({ storeId, jobs = [], onClose, onDone }: Props) {
  const [channel, setChannel] = useState('yampi');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<Out[] | null>(null);

  const run = async () => {
    if (!jobs.length) return;
    setBusy(true);
    setDone(0);
    const out: Out[] = [];
    let i = 0;
    const worker = async () => {
      while (i < jobs.length) {
        const job = jobs[i++];
        const r = channel === 'yampi'
          ? await pushStockChecked(storeId, job.sku, job.stock)
          : { status: 'erro', message: 'Canal ainda nao integrado.' } as PushResult;
        out.push({ job, r });
        setDone((d) => d + 1);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setResults(out);
    setBusy(false);
    onDone?.();
  };

  const count = (s: PushResult['status']) => (results ?? []).filter((x) => x.r.status === s).length;
  const problems = (results ?? []).filter((x) => x.r.status !== 'ok');

  return (
    <Modal title="Sincronizar estoque com canal" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        {!results && (
          <>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} disabled={busy} className={cn(inputCls, 'cursor-pointer')}>
              {CHANNELS.map((c) => <option key={c.key} value={c.key} disabled={!c.enabled}>{c.label}</option>)}
            </select>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {jobs.length
                ? <>Enviar o saldo de <strong>{jobs.length}</strong> variação(ões) selecionada(s) e conferir na Yampi.</>
                : 'Nenhum item selecionado. Marque os produtos na tela de Estoque.'}
            </p>
            {busy && <p className="text-xs font-semibold text-[#0094eb]">Enviando {done} de {jobs.length}...</p>}
          </>
        )}

        {results && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/30">
                <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600" />
                <p className="text-2xl font-extrabold text-emerald-600">{count('ok')}</p>
                <p className="text-xs font-semibold text-emerald-700">confirmado(s) na Yampi</p>
              </div>
              <div className={cn('rounded-xl p-4 text-center', problems.length ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-[#111524]')}>
                <p className={cn('mt-6 text-2xl font-extrabold', problems.length ? 'text-rose-600' : 'text-slate-400')}>{problems.length}</p>
                <p className="text-xs font-semibold text-slate-500">com problema</p>
              </div>
            </div>
            {problems.length > 0 && (
              <ul className="max-h-[30vh] space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                {problems.map((x, i) => (
                  <li key={i}><span className="font-mono font-bold">{x.job.sku}</span> <span className="text-slate-400">{x.job.label}</span><br /><span className="font-semibold text-rose-500">{x.r.message}</span></li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">{results ? 'Fechar' : 'Cancelar'}</button>
          {!results && (
            <button type="button" disabled={busy || jobs.length === 0} onClick={() => void run()} className={primaryBtn + ' disabled:opacity-50'}>
              {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}Sincronizar {jobs.length || ''}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}