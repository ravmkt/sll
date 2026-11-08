import { useState, type ReactNode } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

export function DeviceFrame({ children }: { children: ReactNode }) {
  const [dev, setDev] = useState<'d' | 'm'>('d');
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
      <div className="sticky top-0 z-20 mb-3 flex justify-center">
        <div className="inline-flex gap-1 rounded-lg border bg-white p-1 shadow-sm">
          {btn('d', 'Desktop', <Monitor size={16} />)}
          {btn('m', 'Celular', <Smartphone size={16} />)}
        </div>
      </div>
      <div
        className={
          dev === 'm'
            ? 'mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.5rem] border-4 border-slate-800 bg-white shadow-lg'
            : 'mx-auto w-full max-w-4xl'
        }
      >
        {children}
      </div>
    </div>
  );
}