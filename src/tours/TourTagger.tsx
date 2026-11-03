import { useEffect } from 'react';

export type TagKind = 'card' | 'parent' | 'self' | 'table' | 'wide' | 'list';
export type TagRule = [id: string, rx: RegExp, kind: TagKind];

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

function ownText(el: Element): string {
  if (el.tagName === 'IMG') return norm(el.getAttribute('alt') || '');
  let t = '';
  el.childNodes.forEach((n) => { if (n.nodeType === 3) t += n.textContent || ''; });
  return norm(t);
}

const skip = (el: Element) => !!el.closest('aside,nav,header,[role="dialog"],.driver-popover');
const visible = (el: Element) => (el as HTMLElement).getClientRects().length > 0;

function card(el: Element | null, minW = 200, minH = 80): Element | null {
  let n: Element | null = el;
  while (n && n.tagName !== 'BODY') {
    const r = n.getBoundingClientRect();
    if (/rounded-/.test(n.getAttribute('class') || '') && r.height >= minH && r.width >= minW) return n;
    n = n.parentElement;
  }
  return null;
}

function put(id: string, target: Element | null) {
  if (target && !target.hasAttribute('data-tour')) target.setAttribute('data-tour', id);
}

function listWithoutButton(id: string) {
  const s = document.querySelector('[data-tour="ap-estilos"]');
  const b = s ? s.querySelector('[data-tour="ap-novo"]') : null;
  if (!s || !b) return;
  let c: Element = b;
  while (c.parentElement && c.parentElement !== s) c = c.parentElement;
  const rest = Array.from(s.children)
    .filter((x) => x !== c && x.getBoundingClientRect().height > 0)
    .sort((x, y) => y.getBoundingClientRect().height - x.getBoundingClientRect().height);
  put(id, rest[0] || null);
}

export default function TourTagger({ rules }: { rules: TagRule[] }) {
  useEffect(() => {
    const run = () => {
      const missing = rules.filter(([id]) => !document.querySelector('[data-tour="' + id + '"]'));
      if (!missing.length) return;
      let items: [Element, string][] | null = null;
      missing.forEach(([id, rx, kind]) => {
        if (kind === 'table') {
          const t = Array.from(document.querySelectorAll('table')).find((x) => !skip(x) && visible(x));
          if (t) put(id, card(t) || t);
          return;
        }
        if (kind === 'list') {
          listWithoutButton(id);
          return;
        }
        if (!items) {
          items = [];
          document.body.querySelectorAll('h1,h2,h3,h4,p,span,div,button,label,a,img').forEach((e) => {
            const tx = ownText(e);
            if (tx && !skip(e) && visible(e)) items!.push([e, tx]);
          });
        }
        const hit = items.find(([, tx]) => rx.test(tx));
        if (!hit) return;
        const el = hit[0];
        if (kind === 'self') put(id, el.closest('button') || el);
        else if (kind === 'parent') put(id, (el.closest('button') || el).parentElement);
        else if (kind === 'wide') put(id, card(el, 500, 200));
        else put(id, card(el));
      });
    };
    run();
    const t = window.setInterval(run, 700);
    return () => window.clearInterval(t);
  }, [rules]);
  return null;
}