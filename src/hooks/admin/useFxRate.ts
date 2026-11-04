import { useCallback, useEffect, useState } from 'react';
import { getCostSettings } from '../../services/admin/costsAdmin';

export const FX_EVENT = 'sll:fx-updated';
export const notifyFxUpdated = () => window.dispatchEvent(new Event(FX_EVENT));

// Cotacao USD->BRL global (infrastructure_cost_settings). Recarrega quando o card do Dashboard salva.
export function useFxRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const load = useCallback(() => {
    getCostSettings()
      .then((s: any) => {
        if (!s) return;
        const r = Number(s.usd_to_brl_rate);
        if (Number.isFinite(r) && r > 0) setRate(r);
        setSyncedAt(s.last_currency_sync_at ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(FX_EVENT, load);
    return () => window.removeEventListener(FX_EVENT, load);
  }, [load]);

  return { rate, syncedAt, reload: load };
}