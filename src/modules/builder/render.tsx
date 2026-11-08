import { Fragment } from 'react';
import type { ReactElement } from 'react';
import { BLOCKS } from './registry';
import type { Block } from './types';

export function renderBlock(b: Block): ReactElement {
  const kids = b.children?.map((col, i) => (
    <Fragment key={i}>
      {col.map((c) => (
        <Fragment key={c.id}>{renderBlock(c)}</Fragment>
      ))}
    </Fragment>
  ));
  return BLOCKS[b.type].render(b.props, kids);
}