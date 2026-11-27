import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { showError, showSuccess } from '@/utils/toast';
import { createPhysicalStore } from '../services/canaisVenda';
import { channelName } from '../services/canaisConfig';
import type { ChannelRow, WarehouseOpt } from '../services/canaisConfig';

type Props = {
  storeId: string;
  channels: ChannelRow[];
  warehouses: WarehouseOpt[];
  onClose: () => void;
  onCreated: () => void;
};

export default function PhysicalStoreModal({ storeId, channels, warehouses, onClose, onCreated }: Props) {
  const sources = channels.filter((c) => !c.inherit_from);
  const [name, setName] = useState('');
  const [inherit, setInherit] = useState(sources.find((c) => c.channel === 'yampi')?.channel ?? sources[0]?.channel ?? 'yampi');
  const [wh, setWh] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) { showError('Informe o nome da loja.'); return; }
    setBusy(true);
    try {
      await createPhysicalStore(storeId, name.trim(), inherit, wh || null);
      showSuccess('Loja física criada.');
      onCreated();
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
      title="Nova loja física"
      size="md"
      footer={(
        <>
          <button type="button" disabled={busy} onClick={onClose} className={sllBtnGhost}>Cancelar</button>
          <button type="button" disabled={busy} onClick={() => void save()} className={sllBtnPrimary}>
            {busy && <Loader2 size={15} className="animate-spin" />}Criar loja
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        <SllField label="Nome da loja *">
          <input className={sllFieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Loja Centro" autoFocus />
        </SllField>
        <SllField label="Pagamentos seguem">
          <select className={sllFieldCls + ' cursor-pointer'} value={inherit} onChange={(e) => setInherit(e.target.value)}>
            {sources.map((c) => <option key={c.channel} value={c.channel}>{channelName(c.channel)}</option>)}
          </select>
        </SllField>
        <SllField label="Depósito da loja">
          <select className={sllFieldCls + ' cursor-pointer'} value={wh} onChange={(e) => setWh(e.target.value)}>
            <option value="">Automático</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </SllField>
        <p className="text-[11px] text-slate-400">Depois de criada, a loja aparece em Canais, onde dá para desvincular os pagamentos e editar separado.</p>
      </div>
    </SllModal>
  );
}