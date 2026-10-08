import { useEffect, useRef, useState } from 'react';
import { fetchActive, track, type ActiveItem } from '@/services/marketingPublic';

type Loc = 'home' | 'vidlytics' | 'live';

export default function MarketingBanner({ storeId, location, onActive }: { storeId?: string | null; location: Loc; onActive: (v: boolean) => void }) {
  const [item, setItem] = useState<ActiveItem | null>(null);
  const counted = useRef<string | null>(null);

  useEffect(() => {
    if (!storeId) { setItem(null); onActive(false); return; }
    let alive = true;
    fetchActive(storeId, location)
      .then((list) => {
        if (!alive) return;
        const b = list.find((i) => i.kind === 'banner') ?? null;
        setItem(b);
        onActive(!!b);
      })
      .catch(() => { if (alive) { setItem(null); onActive(false); } });
    return () => { alive = false; };
  }, [storeId, location]);

  useEffect(() => {
    if (!item || !storeId || counted.current === item.id) return;
    counted.current = item.id;
    track(item.id, storeId, 'impression');
  }, [item, storeId]);

  if (!item) return null;

  const go = () => {
    if (storeId) track(item.id, storeId, 'click');
    if (!item.cta_url) return;
    if (/^https?:\/\//i.test(item.cta_url)) window.open(item.cta_url, '_blank', 'noopener');
    else window.location.assign(item.cta_url);
  };

  if (item.image_url) {
    return (
      <button type="button" onClick={go} aria-label={item.title} className={'block w-full overflow-hidden rounded-2xl border border-slate-200 shadow-md ' + (item.cta_url ? 'cursor-pointer' : 'cursor-default')}>
        <img src={item.image_url} alt={item.title} className="block w-full h-auto" />
      </button>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-md border border-slate-800">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{item.title}</h2>
        {item.body && <p className="text-xs text-slate-300">{item.body}</p>}
      </div>
      <div className="flex items-center gap-3">
        {item.coupon_code && <span className="px-2.5 py-1 rounded-md border border-dashed border-amber-400 text-amber-300 text-xs font-bold tracking-wider">{item.coupon_code}</span>}
        {item.cta_url && <button type="button" onClick={go} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold">{item.cta_label || 'Saiba mais'}</button>}
      </div>
    </div>
  );
}