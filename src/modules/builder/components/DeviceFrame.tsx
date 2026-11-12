import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

const W = 1920;
const H = 1080;

export function DeviceFrame({ children }: { children: ReactNode }) {
  const [dev, setDev] = useState<'d' | 'm'>('d');
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [avail, setAvail] = useState(0);
  const [h, setH] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = inner.current;
    if (dev !== 'd' || !el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    setH(el.offsetHeight);
    return () => ro.disconnect();
  }, [dev]);

  const fit = avail > 0 ? Math.min(1, avail / W) : 1;
  const scale = zoom === 'fit' ? fit : zoom;
  const pct = Math.round(scale * 100);

  const btn = (k: 'd' | 'm', label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => setDev(k)}
      className={
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ' +
        (dev === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')
      }
    >
      {icon}
      {label}
    </button>
  );

  const zbtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-md px-2.5 py-1 text-xs font-semibold ' +
        (active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')
      }
    >
      {label}
    </button>
  );

  return (
    <div className="w-full">
      <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-center gap-3">
          <div className="absolute right-0 top-0"><EmojiPicker /></div>
        <div className="inline-flex gap-1 rounded-lg border bg-white p-1 shadow-sm">
          {btn('d', 'Desktop', <Monitor size={16} />)}
          {btn('m', 'Celular', <Smartphone size={16} />)}
        </div>
        {dev === 'd' && (
          <div className="inline-flex items-center gap-2 rounded-lg border bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            <span className="px-1">{W + ' \u00d7 ' + H}</span>
            {zbtn('Ajustar', zoom === 'fit', () => setZoom('fit'))}
            {zbtn('100%', zoom === 1, () => setZoom(1))}
            <input
              type="range"
              min={25}
              max={150}
              step={5}
              value={pct}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="w-32 accent-slate-900"
            />
            <span className="w-10 text-right tabular-nums">{pct + '%'}</span>
          </div>
        )}
      </div>
      <div ref={box} className="w-full overflow-x-auto">
        {dev === 'm' ? (
          <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[1.5rem] border-4 border-slate-700 bg-white shadow-2xl">
            {children}
          </div>
        ) : (
          <div style={{ width: W * scale, height: h * scale, margin: '0 auto' }}>
            <div ref={inner} style={{ width: W, transformOrigin: 'top left', transform: 'scale(' + scale + ')', '--sll-dmin': H + 'px' } as CSSProperties}>
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}