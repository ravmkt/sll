import { useEffect } from 'react';

export function useCardTip() {
  useEffect(() => {
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;z-index:99999;max-width:260px;padding:8px 10px;border-radius:8px;background:#0f172a;color:#fff;font-size:11px;line-height:1.4;font-weight:500;pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.25);display:none;';
    document.body.appendChild(tip);
    const move = (e: MouseEvent) => {
      const el = e.target instanceof Element ? (e.target.closest('[data-card-tip]') as HTMLElement | null) : null;
      if (!el) { tip.style.display = 'none'; return; }
      tip.textContent = el.getAttribute('data-card-tip') || '';
      tip.style.display = 'block';
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      let x = e.clientX + 14;
      let y = e.clientY + 16;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
      if (y + h > window.innerHeight - 8) y = e.clientY - h - 12;
      tip.style.left = Math.max(8, x) + 'px';
      tip.style.top = Math.max(8, y) + 'px';
    };
    const hide = () => { tip.style.display = 'none'; };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', hide);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', hide);
      tip.remove();
    };
  }, []);
}