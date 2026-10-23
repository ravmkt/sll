import { useEffect, useRef, useState } from 'react';
import { useLoja } from '@/contexts/LojaContext';
import { fetchActive, track, type ActiveItem } from '@/services/marketingPublic';

type Loc = 'home' | 'vidlytics' | 'live';

// Aparece so em telas com pelo menos 1366 x 560 px
const QUERY = '(min-width: 1366px) and (min-height: 560px)';

// Largura responsiva: 220-300 px conforme a largura da tela, limitada pela altura visivel (proporcao 1:2)
const TOP = 'calc(var(--trial-h, 0px) + var(--notice-h, 0px) + 88px)';
const W = 'min(clamp(220px, 16vw, 300px), calc((100vh - var(--trial-h, 0px) - var(--notice-h, 0px) - 104px) / 2))';

function useFits() {
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setOk(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ok;
}

export default function MarketingSideBanner({ location }: { location: Loc }) {
  const { storeId } = useLoja() as { storeId: string | null };
  const fits = useFits();
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
  const visible = fits && !!storeId && !!cur;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--side-banner-w', visible ? 'calc(' + W + ' + 32px)' : '0px');
    return () => { root.style.setProperty('--side-banner-w', '0px'); };
  }, [visible]);

  useEffect(() => {
    if (!fits || !storeId || !cur || counted.current.has(cur.id)) return;
    counted.current.add(cur.id);
    track(cur.id, storeId, 'impression');
  }, [fits, storeId, cur]);

  if (!visible || !cur || !storeId) return null;

  const go = () => {
    track(cur.id, storeId, 'click');
    if (!cur.cta_url) return;
    if (/^https?:\/\//i.test(cur.cta_url)) window.open(cur.cta_url, '_blank', 'noopener');
    else window.location.assign(cur.cta_url);
  };

  return (
    <aside className="fixed right-4 z-30" style={{ top: TOP, width: W }} aria-label="Publicidade">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ aspectRatio: '1 / 2' }}>
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