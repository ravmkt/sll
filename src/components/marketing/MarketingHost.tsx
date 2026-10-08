import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fetchActive, track, type ActiveItem } from '@/services/marketingPublic';

type Loc = 'home' | 'vidlytics' | 'live';

const today = () => new Date().toISOString().slice(0, 10);
const seenOk = (i: ActiveItem) => {
  try {
    const v = localStorage.getItem('mk:seen:' + i.id);
    if (i.frequency === 'session') return sessionStorage.getItem('mk:sess:' + i.id) === null;
    if (i.frequency === 'once') return !v;
    if (i.frequency === 'daily') return v !== today();
    return true;
  } catch { return true; }
};
const markSeen = (i: ActiveItem) => {
  try { localStorage.setItem('mk:seen:' + i.id, today()); sessionStorage.setItem('mk:sess:' + i.id, '1'); } catch { /* ignora */ }
};
const wasClosed = (id: string) => {
  try { return sessionStorage.getItem('mk:closed:' + id) === '1'; } catch { return false; }
};
const setClosed = (id: string) => {
  try { sessionStorage.setItem('mk:closed:' + id, '1'); } catch { /* ignora */ }
};

export default function MarketingHost({ storeId, location, showBanner = true }: { storeId?: string | null; location: Loc; showBanner?: boolean }) {
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [closed, setClosedState] = useState<Set<string>>(new Set());
  const counted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!storeId) { setItems([]); return; }
    let alive = true;
    fetchActive(storeId, location).then((list) => {
      if (!alive) return;
      setItems(list.filter((i) => i.kind === 'banner' || seenOk(i)));
    });
    return () => { alive = false; };
  }, [storeId, location]);

  const banner = !showBanner ? undefined : items.find((i) => i.kind === 'banner' && !closed.has(i.id) && !wasClosed(i.id));
  const popup = items.find((i) => i.kind === 'popup' && !closed.has(i.id));

  useEffect(() => {
    if (!storeId) return;
    [banner, popup].forEach((i) => {
      if (!i || counted.current.has(i.id)) return;
      counted.current.add(i.id);
      track(i.id, storeId, 'impression');
      if (i.kind === 'popup') markSeen(i);
    });
  }, [banner, popup, storeId]);

  const close = (i: ActiveItem) => {
    if (storeId) track(i.id, storeId, 'close');
    setClosed(i.id);
    setClosedState((prev) => new Set(prev).add(i.id));
  };
  const go = (i: ActiveItem) => {
    if (storeId) track(i.id, storeId, 'click');
    if (!i.cta_url) return;
    if (/^https?:\/\//i.test(i.cta_url)) window.open(i.cta_url, '_blank', 'noopener');
    else window.location.assign(i.cta_url);
  };

  const cta = (i: ActiveItem) =>
    i.cta_url ? (
      <button type="button" onClick={() => go(i)} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold">
        {i.cta_label || 'Saiba mais'}
      </button>
    ) : null;

  const coupon = (i: ActiveItem) =>
    i.coupon_code ? (
      <span className="px-2.5 py-1 rounded-md border border-dashed border-amber-500 text-amber-600 text-xs font-bold tracking-wider">{i.coupon_code}</span>
    ) : null;

  return (
    <>
      {banner && (
        <div className="fixed bottom-0 inset-x-0 z-[90] flex justify-center bg-slate-900 shadow-2xl border-t border-slate-700">
          {banner.image_url ? (
            <div className="relative w-full max-w-[1200px]">
              <button type="button" onClick={() => go(banner)} aria-label={banner.title} className={'block w-full ' + (banner.cta_url ? 'cursor-pointer' : 'cursor-default')}>
                <img src={banner.image_url} alt={banner.title} className="block w-full h-auto" />
              </button>
              <button type="button" aria-label="Fechar" onClick={() => close(banner)} className="absolute right-2 top-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full max-w-5xl flex items-center gap-3 px-4 py-2.5 text-white">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{banner.title}</p>
                {banner.body && <p className="text-xs text-slate-300 truncate">{banner.body}</p>}
              </div>
              {coupon(banner)}
              {cta(banner)}
              <button type="button" aria-label="Fechar" onClick={() => close(banner)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
      {popup && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => close(popup)} role="dialog" aria-modal="true" aria-label={popup.title}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Fechar" onClick={() => close(popup)} className="absolute right-3 top-3 z-10 p-1 rounded-full bg-white/90 text-slate-500 hover:text-slate-900">
              <X className="w-4 h-4" />
            </button>
            {popup.image_url && (
              <img src={popup.image_url} alt="" onClick={() => go(popup)} className={'w-full h-auto block ' + (popup.cta_url ? 'cursor-pointer' : '')} />
            )}
            <div className={'p-5 space-y-3 text-center' + (popup.image_url ? ' hidden' : '')}>
              <h3 className="text-lg font-bold text-slate-900">{popup.title}</h3>
              {popup.body && <p className="text-sm text-slate-600">{popup.body}</p>}
              <div className="flex items-center justify-center gap-3">{coupon(popup)}{cta(popup)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}