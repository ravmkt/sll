import { useEffect } from 'react';

const SELECTOR = 'img[src*="noah-suporte"]';

// Esconde o balao de Suporte (Noah / WhatsApp) enquanto o editor esta aberto.
export function useHideSupport() {
  useEffect(() => {
    const hidden = new Map<HTMLElement, string>();

    const fixedAncestor = (el: Element): HTMLElement | null => {
      let cur: HTMLElement | null = el.parentElement;
      while (cur && cur !== document.body) {
        if (getComputedStyle(cur).position === 'fixed') return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const hide = () => {
      document.querySelectorAll(SELECTOR).forEach((img) => {
        const box = fixedAncestor(img);
        if (box && !hidden.has(box)) {
          hidden.set(box, box.style.display);
          box.style.display = 'none';
        }
      });
    };

    hide();
    const mo = new MutationObserver(hide);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      hidden.forEach((display, box) => {
        box.style.display = display;
      });
      hidden.clear();
    };
  }, []);
}