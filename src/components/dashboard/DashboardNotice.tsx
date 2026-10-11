import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { fetchActive, track, type ActiveItem } from '@/services/marketingPublic';

const keyOf = (id: string) => `banner_dismissed_${id}`;
const dismissed = (id: string) => {
  try { return localStorage.getItem(keyOf(id)) === '1'; } catch { return false; }
};

// Banner da Home gerenciado em Master > Marketing > Banners (local "Home do SLL" ou "Todos")
export default function DashboardNotice({ storeId }: { storeId: string | null | undefined }) {
  const navigate = useNavigate();
  const [item, setItem] = useState<ActiveItem | null>(null);
  const counted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    fetchActive(storeId, 'home').then((list) => {
      if (!alive) return;
      const next = list.find((i) => i.kind === 'banner' && !dismissed(i.id)) ?? null;
      setItem(next);
    });
    return () => { alive = false; };
  }, [storeId]);

  useEffect(() => {
    if (!item || !storeId || counted.current.has(item.id)) return;
    counted.current.add(item.id);
    track(item.id, storeId, 'impression');
  }, [item, storeId]);

  if (!item) return null;

  const close = () => {
    if (storeId) track(item.id, storeId, 'close');
    try { localStorage.setItem(keyOf(item.id), '1'); } catch { /* ignora */ }
    setItem(null);
  };
  const go = () => {
    if (storeId) track(item.id, storeId, 'click');
    if (!item.cta_url) return;
    if (/^https?:\/\//i.test(item.cta_url)) window.open(item.cta_url, '_blank', 'noopener');
    else navigate(item.cta_url);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#0b3a5c] p-6 shadow-sm">
      <button
        type="button"
        onClick={close}
        aria-label="Fechar aviso"
        className="absolute right-3 top-3 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 max-w-xl space-y-3 pr-6">
          {item.coupon_code && (
            <span className="inline-block rounded-full border border-dashed border-[#fd8539] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#fd8539]">
              Cupom {item.coupon_code}
            </span>
          )}
          <h2 className="text-xl font-black leading-tight text-white">{item.title}</h2>
          {item.body && <p className="text-sm leading-relaxed text-slate-300">{item.body}</p>}
          {item.cta_url && (
            <button
              type="button"
              onClick={go}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#007fcc]"
            >
              {item.cta_label || 'Saiba mais'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {item.image_url && (
          <img src={item.image_url} alt="" className="hidden h-28 w-auto max-w-[220px] shrink-0 rounded-2xl object-cover sm:block" />
        )}
      </div>
    </div>
  );
}