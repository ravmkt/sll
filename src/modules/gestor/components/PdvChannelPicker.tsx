import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { showError } from '@/utils/toast';
import { SALE_ORIGINS, mySaleChannels } from '../services/canaisVenda';
import type { SaleChannel, SaleOrigin } from '../services/canaisVenda';

type Props = {
  storeId: string;
  channel: string;
  origin: SaleOrigin;
  /** warehouseId vem da loja escolhida (null = deixa a funcao decidir) */
  onChannelChange: (channel: string, warehouseId: string | null) => void;
  onOriginChange: (origin: SaleOrigin) => void;
  disabled?: boolean;
};

export default function PdvChannelPicker({ storeId, channel, origin, onChannelChange, onOriginChange, disabled }: Props) {
  const [list, setList] = useState<SaleChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    mySaleChannels(storeId)
      .then((l) => {
        if (!on) return;
        setList(l);
        const cur = l.find((c) => c.channel === channel) ?? l[0];
        if (cur && cur.channel !== channel) onChannelChange(cur.channel, cur.warehouse_id);
        else if (cur) onChannelChange(cur.channel, cur.warehouse_id);
      })
      .catch((e) => showError((e as Error).message))
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  if (loading) return <Loader2 size={16} className="animate-spin text-[color:var(--sll-b-brand)]" />;
  if (list.length === 0) {
    return <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Você não tem loja liberada para vender. Peça ao administrador.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SllField label="Loja">
        <select
          className={sllFieldCls + ' cursor-pointer'}
          disabled={disabled || list.length === 1}
          value={channel}
          onChange={(e) => {
            const c = list.find((x) => x.channel === e.target.value);
            if (c) onChannelChange(c.channel, c.warehouse_id);
          }}
        >
          {list.map((c) => <option key={c.channel} value={c.channel}>{c.label}</option>)}
        </select>
      </SllField>
      <SllField label="Origem da venda">
        <select className={sllFieldCls + ' cursor-pointer'} disabled={disabled} value={origin} onChange={(e) => onOriginChange(e.target.value as SaleOrigin)}>
          {SALE_ORIGINS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </SllField>
    </div>
  );
}