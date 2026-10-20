import { useEffect, useState } from 'react';
import { getCostSettings } from '../../services/admin/costsAdmin';

// Cotacao USD->BRL gravada pelo cron diario (infrastructure_cost_settings)
export function useFxRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getCostSettings()
      .then((s: any) => {
        if (!alive || !s) return;
        const r = Number(s.usd_to_brl_rate);
        if (Number.isFinite(r) && r > 0) setRate(r);
        setSyncedAt(s.last_currency_sync_at ?? null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return { rate, syncedAt };
}