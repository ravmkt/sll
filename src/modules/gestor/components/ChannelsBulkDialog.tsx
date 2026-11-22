import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { showError, showSuccess } from '@/utils/toast';
import { CHANNEL_META, listActiveChannels } from '../services/canais';
import type { ChannelKey } from '../services/canais';
import { setChannelLink } from '../services/vinculos';
import ChannelFavicon from './ChannelFavicon';

type Act = 'keep' | 'link' | 'unlink';
type Props = { storeId: string; productIds: string[]; onClose: () => void; onDone: () => void };

export default function ChannelsBulkDialog({ storeId, productIds, onClose, onDone }: Props) {
  const [active, setActive] = useState<ChannelKey[]>([]);
  const [acts, setActs] = useState<Record<string, Act>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listActiveChannels(storeId)
      .then(setActive)
      .catch((e) => showError((e as Error).message))
      .finally(() => setLoading(false));
  }, [storeId]);

  const todo = active.filter((c) => (acts[c] ?? 'keep') !== 'keep');

  async function apply() {
    setBusy(true);
    const failed: string[] = [];
    let ok = 0;
    for (const ch of todo) {
      try {
        await setChannelLink(storeId, productIds, ch, acts[ch] === 'link');
        ok++;
      } catch (e) {
        failed.push(`${CHANNEL_META[ch].label}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    if (ok) { showSuccess(`${ok} canal(is) atualizado(s) em ${productIds.length} produto(s).`); onDone(); }
    if (failed.length) showError(failed.join(' | '));
    else onClose();
  }

  return (
    <Modal title={`Canais de ${productIds.length} produto(s)`} onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        <p className="text-xs text-slate-500">
          Para cada canal, escolha se os produtos selecionados passam a ser vendidos nele, saem dele ou ficam como estão.
          Ex.: Mercado Livre = Vincular e Yampi = Remover deixa os produtos só no Mercado Livre.
        </p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
        ) : active.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum canal ativo. Ative em Estoque › Canais e depósitos.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((ch) => (
              <li key={ch} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[color:var(--sll-bg)] px-4 py-2.5 dark:border-slate-800">
                <ChannelFavicon channel={ch} size={24} />
                <span className="min-w-0 flex-1 text-sm font-semibold">{CHANNEL_META[ch].label}</span>
                <select
                  value={acts[ch] ?? 'keep'}
                  disabled={busy}
                  onChange={(e) => setActs((p) => ({ ...p, [ch]: e.target.value as Act }))}
                  className={inputCls + ' !w-40 !py-1.5 !text-xs cursor-pointer'}
                >
                  <option value="keep">Manter como está</option>
                  <option value="link">Vincular (vender)</option>
                  <option value="unlink">Remover</option>
                </select>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancelar</button>
          <button type="button" disabled={busy || todo.length === 0} onClick={() => void apply()} className={primaryBtn + ' disabled:opacity-50'}>
            {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}Aplicar
          </button>
        </div>
      </div>
    </Modal>
  );
}