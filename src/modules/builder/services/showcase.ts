import type { Block, PageContent } from '../types';
import { parseItems } from '../styleKit';
import { getProductsByIds, type StoreProduct } from './products';

function collect(blocks: Block[], out: Set<string>) {
  for (const b of blocks) {
    if (b.type === 'showcase') {
      for (const it of parseItems(b.props?.items ?? '')) if (it.id) out.add(it.id);
    }
    (b.children ?? []).forEach((col) => collect(col, out));
  }
}

function apply(blocks: Block[], map: Map<string, StoreProduct>): Block[] {
  return blocks.map((b) => {
    const children = b.children?.map((col) => apply(col, map));
    const base = children ? { ...b, children } : b;
    if (b.type !== 'showcase') return base;
    const next = parseItems(b.props?.items ?? '')
      .filter((it) => !it.id || map.has(it.id))
      .map((it) => {
        const p = it.id ? map.get(it.id) : undefined;
        if (!p) return it;
        return {
          ...it,
          n: p.name,
          p: p.price != null ? String(p.price) : '',
          s: p.salePrice != null ? String(p.salePrice) : '',
          i: p.image,
          u: p.url,
        };
      });
    return { ...base, props: { ...b.props, items: JSON.stringify(next) } };
  });
}

export async function refreshShowcases(content: PageContent): Promise<PageContent> {
  const ids = new Set<string>();
  collect(content.blocks, ids);
  if (!ids.size) return content;
  try {
    const found = await getProductsByIds(Array.from(ids));
    if (!found.length) return content;
    const map = new Map<string, StoreProduct>(found.map((p) => [p.id, p]));
    return { ...content, blocks: apply(content.blocks, map) };
  } catch {
    return content;
  }
}