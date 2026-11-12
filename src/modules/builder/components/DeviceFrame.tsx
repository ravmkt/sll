import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

const W = 1920;
const H = 1080;
const ZOOMS = [
  { value: 'fit', label: 'Ajustar' },
  { value: '1', label: '100%' },
  { value: '0.75', label: '75%' },
  { value: '0.5', label: '50%' },
];

export function DeviceFrame({ children }: { children: ReactNode }) {
  const [dev, setDev] = useState<'d' | 'm'>('d');
  const [zoom, setZoom] = useState('fit');
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
  const scale = zoom === 'fit' ? fit : Number(zoom) || 1;

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

  return (
    <div className="w-full">
      <div className="sticky top-0 z-20 mb-3 flex items-center justify-center gap-3">
        <div className="inline-flex gap-1 rounded-lg border bg-white p-1 shadow-sm">
          {btn('d', 'Desktop', <Monitor size={16} />)}
          {btn('m', 'Celular', <Smartphone size={16} />)}
        </div>
        {dev === 'd' && (
          <div className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
            <span>{W + ' \u00d7 ' + H + ' \u00b7 ' + Math.round(scale * 100) + '%'}</span>
            <select value={zoom} onChange={(e) => setZoom(e.target.value)} className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs">
              {ZOOMS.map((z) => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div ref={box} className="w-full overflow-x-auto">
        {dev === 'm' ? (
          <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[1.5rem] border-4 border-slate-800 bg-white shadow-lg">
            {children}
          </div>
        ) : (
          <div style={{ width: W * scale, height: h * scale, margin: '0 auto' }}>
            <div ref={inner} style={{ width: W, transformOrigin: 'top left', transform: 'scale(' + scale + ')' }}>
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}