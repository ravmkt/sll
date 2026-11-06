import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { fetchPush, track, type ActiveItem } from '@/services/marketingPublic';

type App = 'hub' | 'vidlytics' | 'live';

const STYLE_COLORS: Record<string, string> = {
  info: '#0094eb',
  warning: '#f59e0b',
  urgent: '#e11d48',
  success: '#16a34a',
};

const safe = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } },
};

export default function PushCard({ app, storeId, isExpanded }: { app: App; storeId: string; isExpanded: boolean }) {
  const [item, setItem] = useState<ActiveItem | null>(null);
  const appColor = app === 'live' ? '#e11d48' : '#0094eb';
  const color = (item?.notice_style && STYLE_COLORS[item.notice_style]) || appColor;

  useEffect(() => {
    let alive = true;
    fetchPush(storeId, app).then((it) => {
      if (!alive || !it) return;
      if (safe.get('sll:push:closed:' + it.id)) return;
      setItem(it);
      const k = 'sll:push:imp:' + it.id + ':' + new Date().toISOString().slice(0, 10);
      if (!safe.get(k)) { safe.set(k, '1'); track(it.id, storeId, 'impression'); }
    });
    return () => { alive = false; };
  }, [app, storeId]);

  if (!item) return null;

  const close = () => {
    safe.set('sll:push:closed:' + item.id, '1');
    track(item.id, storeId, 'close');
    setItem(null);
  };
  const click = () => track(item.id, storeId, 'click');
  const external = !!item.cta_url && /^https?:\/\//i.test(item.cta_url);

  if (!isExpanded) {
    return (
      <a
        href={item.cta_url || undefined}
        target={external ? '_blank' : undefined}
        rel="noreferrer"
        onClick={click}
        title={item.title}
        className="flex items-center justify-center rounded-lg p-2 text-white"
        style={{ background: color }}
      >
        <Bell size={18} />
      </a>
    );
  }

  return (
    <div className="relative rounded-xl border p-3" style={{ borderColor: color + '55', background: color + '12' }}>
      <button type="button" onClick={close} title="Dispensar" className="absolute right-2 top-2 cursor-pointer text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
      <div className="flex items-center gap-2 pr-5" style={{ color }}>
        <Bell size={16} className="shrink-0" />
        <p className="text-xs font-bold">{item.title}</p>
      </div>
      {item.body && <p className="mt-1.5 text-[12px] leading-snug text-slate-600 dark:text-slate-300">{item.body}</p>}
      {item.coupon_code && (
        <p className="mt-1.5 inline-block rounded bg-white px-2 py-0.5 text-[11px] font-bold tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {item.coupon_code}
        </p>
      )}
      {item.cta_url && (
        <a
          href={item.cta_url}
          target={external ? '_blank' : undefined}
          rel="noreferrer"
          onClick={click}
          className="mt-2 block rounded-lg py-1.5 text-center text-xs font-bold text-white"
          style={{ background: color }}
        >
          {item.cta_label || 'Saiba mais'}
        </a>
      )}
    </div>
  );
}