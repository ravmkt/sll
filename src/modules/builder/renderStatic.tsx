import { Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BLOCKS } from './registry';
import type { Block } from './types';

function node(b: Block): ReactNode {
  if (b.props?.hidden === '1') return null;
  const def = BLOCKS[b.type];
  if (!def) return null;
  const kids = (b.children ?? []).map((col, i) => (
    <Fragment key={i}>
      {col.map((c) => (
        <Fragment key={c.id}>{node(c)}</Fragment>
      ))}
    </Fragment>
  ));
  return def.render(b.props ?? {}, kids);
}

export function renderBlocksHtml(blocks: Block[]): string {
  return renderToStaticMarkup(
    <>
      {blocks.map((b) => (
        <Fragment key={b.id}>{node(b)}</Fragment>
      ))}
    </>,
  );
}