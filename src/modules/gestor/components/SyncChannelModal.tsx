import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { pushStockConfirmed } from '../services/syncConfirm';
import type { SyncOutcome } from '../services/syncConfirm';

export type SyncJob = { sku: string; stock: number; label: string };
type Row = SyncOutcome & { label: string };

// Para ativar um canal novo: enabled: true + tratar a key em sendOne()
const CHANNELS = [
  { key: 'yampi', label: 'Yampi (e-commerce)', enabled: true },
  { key: 'nuvemshop', label: 'Nuvemshop (em breve)', enabled: false },
  { key: 'social', label: 'Redes sociais (em breve)', enabled: false },
];

type Props = { storeId: string; jobs: SyncJob[]; onClose: () => void };

export default function SyncChannelModal({ storeId, jobs, onClose }: Props) {
  const [channel, setChannel] = useState('yampi');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [rows, setRows] = useState<Row[] | null>(null);

  const sendOne = (key: string, j: SyncJob): Promise<SyncOutcome> => {
    if (key === 'yampi') return pushStockConfirmed(storeId, j.sku, j.stock);
    return Promise.resolve({ sku: j.sku, sent: j.stock, remote: null, result: 'error', message: 'Canal ainda não integrado.' });
  };

  const run = async () => {
    setBusy(true);
    setDone(0);
    const out: Row[] = [];
    let i = 0;
    const worker = async () => {
      while (i < jobs.length) {
        const j = jobs[i++];
        const r = await sendOne(channel, j);
        out.push({ ...r, label: j.label });
        setDone((d) => d + 1);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    setRows(out);
    setBusy(false);
  };

  const count = (k: string) => (rows ?? []).filter((r) => r.result === k).length;
  const problems = (rows ?? []).filter((r) => r.result !== 'confirmed');

  return (
    <Modal title="Sincronizar estoque com canal" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        {!rows ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>{jobs.length}</strong> variação(ões) serão enviadas com o saldo já salvo no ERP.
            </p>
            <select value={channel} disabled={busy} onChange={(e) => setChannel(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
              {CHANNELS.map((c) => <option key={c.key} value={c.key} disabled={!c.enabled}>{c.label}</option>)}
            </select>
            <p className="text-[11px] text-slate-400">Cada envio é conferido: o app lê o saldo de volta no canal e só marca como confirmado se for igual.</p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([['confirmed', 'confirmado', 'text-emerald-600'], ['diverged', 'divergente', 'text-amber-600'], ['skip', 'sem vínculo', 'text-slate-500'], ['error', 'erro', 'text-rose-600']] as const).map(([k, l, c]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3 dark:bg-[#111524]">
                  <p className={cn('text-2xl font-extrabold', c)}>{count(k)}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{l}</p>
                </div>
              ))}
            </div>
            {problems.length > 0 && (
              <div className="max-h-[35vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <ul className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {problems.slice(0, 100).map((r) => (
                    <li key={r.sku} className="px-3 py-2">
                      <p className="font-semibold">{r.label} <span className="font-mono text-slate-400">{r.sku}</span></p>
                      <p className={cn(r.result === 'diverged' ? 'text-amber-600' : r.result === 'skip' ? 'text-slate-500' : 'text-rose-500')}>{r.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">
            {rows ? 'Fechar' : 'Cancelar'}
          </button>
          {!rows && (
            <button type="button" disabled={busy || jobs.length === 0} onClick={() => void run()} className={primaryBtn + ' disabled:opacity-50'}>
              {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}
              {busy ? `Enviando ${done}/${jobs.length}...` : 'Sincronizar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}