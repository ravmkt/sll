import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';
import { listPhysicalChannels, sellerChannelsGet, sellerChannelsSet } from '../services/canaisVenda';
import type { PhysicalChannel } from '../services/canaisVenda';

const checkCls = 'h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]';

type Props = { storeId: string; userId: string; name: string; onClose: () => void };

export default function SellerChannelsModal({ storeId, userId, name, onClose }: Props) {
  const [list, setList] = useState<PhysicalChannel[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    Promise.all([listPhysicalChannels(storeId), sellerChannelsGet(storeId)])
      .then(([l, m]) => { if (on) { setList(l); setSel(m[userId] ?? []); } })
      .catch((e) => showError((e as Error).message))
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [storeId, userId]);

  const all = sel.length === 0;
  const toggle = (c: string) => setSel((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  async function save() {
    setBusy(true);
    try {
      await sellerChannelsSet(storeId, userId, sel);
      showSuccess('Lojas do vendedor salvas.');
      onClose();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SllModal
      open
      onOpenChange={(v) => { if (!v && !busy) onClose(); }}
      title={`Lojas de ${name}`}
      size="md"
      footer={(
        <>
          <button type="button" disabled={busy} onClick={onClose} className={sllBtnGhost}>Cancelar</button>
          <button type="button" disabled={busy || loading} onClick={() => void save()} className={sllBtnPrimary}>
            {busy && <Loader2 size={15} className="animate-spin" />}Salvar
          </button>
        </>
      )}
    >
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[color:var(--sll-b-brand)]" /></div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Escolha em quais lojas físicas este vendedor pode vender. Sem nenhuma marcada, ele vende em todas. O e-commerce não é afetado.</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/50">
            <input type="checkbox" className={checkCls} checked={all} onChange={() => setSel([])} />
            Todas as lojas
          </label>
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.channel}>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
                  <input type="checkbox" className={checkCls} checked={sel.includes(c.channel)} onChange={() => toggle(c.channel)} />
                  <span className="flex-1 font-medium">{c.label}</span>
                  {!c.active && <span className="text-[10px] font-bold uppercase text-slate-400">Inativa</span>}
                </label>
              </li>
            ))}
            {list.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Nenhuma loja física cadastrada. Crie em Configurações › Canais.</li>}
          </ul>
        </div>
      )}
    </SllModal>
  );
}