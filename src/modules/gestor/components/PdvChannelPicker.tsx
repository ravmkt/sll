import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { showError } from '@/utils/toast';
import { SALE_ORIGINS, mySaleChannels } from '../services/canaisVenda';
import type { SaleChannel, SaleOrigin } from '../services/canaisVenda';
import { loadCache, saveCache } from '../services/pdvOffline';

type Props = {
  storeId: string;
  channel: string;
  origin: SaleOrigin;
  /** warehouseId vem da loja escolhida (null = deixa a funcao decidir) */
  onChannelChange: (channel: string, warehouseId: string | null) => void;
  onOriginChange: (origin: SaleOrigin) => void;
  disabled?: boolean;
};

async function fetchChannels(storeId: string): Promise<SaleChannel[]> {
  const key = 'channels:' + storeId;
  if (navigator.onLine) {
    try {
      const l = await mySaleChannels(storeId);
      await saveCache(key, l);
      return l;
    } catch (e) {
      const c = await loadCache<SaleChannel[]>(key);
      if (c) return c.value;
      throw e;
    }
  }
  const c = await loadCache<SaleChannel[]>(key);
  if (!c) throw new Error('Sem conexão e sem lojas salvas neste aparelho. Conecte-se uma vez para baixá-las.');
  return c.value;
}

export default function PdvChannelPicker({ storeId, channel, origin, onChannelChange, onOriginChange, disabled }: Props) {
  const [list, setList] = useState<SaleChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    fetchChannels(storeId)
      .then((l) => {
        if (!on) return;
        setList(l);
        const cur = l.find((c) => c.channel === channel) ?? l[0];
        if (cur) onChannelChange(cur.channel, cur.warehouse_id);
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