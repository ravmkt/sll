import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getCockpit, getRecentEvents,
  type CockpitData, type CockpitEvent,
} from '@/services/streamSell/streamSellService';

export function useLiveCockpit(liveId: string | undefined) {
  const [data, setData] = useState<CockpitData | null>(null);
  const [events, setEvents] = useState<CockpitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (!liveId) return;
    try {
      setData(await getCockpit(liveId));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar a live');
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    if (!liveId) return;
    setLoading(true);
    reload();
    getRecentEvents(liveId).then(setEvents).catch(() => {});

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(reload, 250);
    };
    const ch = supabase
      .channel(`cockpit-${liveId}`)
      .on('postgres_changes', { event: '*', schema: 'live_commerce', table: 'live_products', filter: `live_id=eq.${liveId}` }, schedule)
      .on('postgres_changes', { event: '*', schema: 'live_commerce', table: 'live_coupons', filter: `live_id=eq.${liveId}` }, schedule)
      .on('postgres_changes', { event: 'UPDATE', schema: 'live_commerce', table: 'lives', filter: `id=eq.${liveId}` }, schedule)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'live_commerce', table: 'live_events', filter: `live_id=eq.${liveId}` },
        (p: any) => setEvents((prev) => [p.new as CockpitEvent, ...prev].slice(0, 30)),
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
  }, [liveId, reload]);

  return { data, events, loading, error, reload };
}