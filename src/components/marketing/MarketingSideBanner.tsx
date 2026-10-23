import { useEffect, useRef, useState } from 'react';
import { useLoja } from '@/contexts/LojaContext';
import { fetchActive, track, type ActiveItem } from '@/services/marketingPublic';

type Loc = 'home' | 'vidlytics' | 'live';

const MIN_WIDTH = 1440;

function useWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= MIN_WIDTH);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: ' + MIN_WIDTH + 'px)');
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function MarketingSideBanner({ location }: { location: Loc }) {
  const { storeId } = useLoja() as { storeId: string | null };
  const wide = useWide();
  const [slides, setSlides] = useState<ActiveItem[]>([]);
  const [idx, setIdx] = useState(0);
  const counted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!storeId) { setSlides([]); return; }
    let alive = true;
    fetchActive(storeId, location).then((list) => {
      if (!alive) return;
      const vertical = list.filter((i) => i.kind === 'banner' && i.banner_format === 'vertical' && !!i.image_url);
      const firstId = vertical[0]?.id;
      setSlides(vertical.filter((i) => i.id === firstId));
      setIdx(0);
    });
    return () => { alive = false; };
  }, [storeId, location]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const cur = slides.length ? slides[idx % slides.length] : undefined;
  const visible = wide && !!storeId && !!cur;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--side-banner-w', visible ? '316px' : '0px');
    return () => { root.style.setProperty('--side-banner-w', '0px'); };
  }, [visible]);

  useEffect(() => {
    if (!wide || !storeId || !cur || counted.current.has(cur.id)) return;
    counted.current.add(cur.id);
    track(cur.id, storeId, 'impression');
  }, [wide, storeId, cur]);

  if (!visible || !cur || !storeId) return null;

  const go = () => {
    track(cur.id, storeId, 'click');
    if (!cur.cta_url) return;
    if (/^https?:\/\//i.test(cur.cta_url)) window.open(cur.cta_url, '_blank', 'noopener');
    else window.location.assign(cur.cta_url);
  };

  return (
    <aside
      className="fixed right-4 z-30"
      style={{ top: 'calc(var(--trial-h, 0px) + var(--notice-h, 0px) + 88px)', width: 300 }}
      aria-label="Publicidade"
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ width: 300, height: 600 }}>
        <button
          type="button"
          onClick={go}
          aria-label={cur.title}
          className={'block h-full w-full ' + (cur.cta_url ? 'cursor-pointer' : 'cursor-default')}
        >
          <img src={cur.image_url ?? ''} alt={cur.title} className="h-full w-full object-cover" />
        </button>
        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {slides.map((s, n) => (
              <button
                key={s.id + ':' + n}
                type="button"
                aria-label={'Banner ' + (n + 1)}
                onClick={() => setIdx(n)}
                className={'h-2 w-2 rounded-full ' + (n === idx % slides.length ? 'bg-white' : 'bg-white/50')}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}