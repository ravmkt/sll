import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
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
      const next = list.find((i) => i.kind === 'banner' && !!i.image_url && !dismissed(i.id)) ?? null;
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

  const img = <img src={item.image_url ?? ''} alt={item.title} className="block h-auto max-h-44 w-full object-cover object-center" />;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm">
      {item.cta_url ? (
        <button type="button" onClick={go} aria-label={item.title} className="block w-full cursor-pointer">
          {img}
        </button>
      ) : (
        img
      )}
      <button
        type="button"
        onClick={close}
        aria-label="Fechar aviso"
        className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/80 p-1 text-slate-700 shadow-sm transition-colors hover:bg-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}