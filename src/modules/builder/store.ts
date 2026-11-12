import { create } from 'zustand';
import type { Block, BlockType } from './types';
import { BLOCKS } from './registry';

export interface Target { parentId: string | null; col: number; index?: number }

const uid = () => crypto.randomUUID();

export function makeBlock(type: BlockType, cols?: number): Block {
  const props = { ...BLOCKS[type].defaults };
  const b: Block = { id: uid(), type, props };
  if (type === 'columns') {
    const n = Math.min(4, Math.max(1, cols ?? (Number(props.cols) || 2)));
    props.cols = String(n);
    b.children = Array.from({ length: n }, () => [] as Block[]);
  }
  return b;
}

export function findBlock(list: Block[], id: string): Block | null {
  for (const b of list) {
    if (b.id === id) return b;
    for (const c of b.children ?? []) {
      const r = findBlock(c, id);
      if (r) return r;
    }
  }
  return null;
}

export function findLoc(list: Block[], id: string, parentId: string | null = null, col = 0): Target | null {
  const i = list.findIndex((b) => b.id === id);
  if (i >= 0) return { parentId, col, index: i };
  for (const b of list) {
    const ch = b.children ?? [];
    for (let c = 0; c < ch.length; c++) {
      const r = findLoc(ch[c], id, b.id, c);
      if (r) return r;
    }
  }
  return null;
}

const removeById = (list: Block[], id: string): Block[] =>
  list
    .filter((b) => b.id !== id)
    .map((b) => (b.children ? { ...b, children: b.children.map((c) => removeById(c, id)) } : b));

function editList(list: Block[], parentId: string | null, col: number, fn: (l: Block[]) => Block[]): Block[] {
  if (parentId === null) return fn(list);
  return list.map((b) => {
    if (b.id === parentId && b.children) {
      return { ...b, children: b.children.map((c, i) => (i === col ? fn(c) : c)) };
    }
    return b.children ? { ...b, children: b.children.map((c) => editList(c, parentId, col, fn)) } : b;
  });
}

function insertAt(list: Block[], t: Target, block: Block): Block[] {
  return editList(list, t.parentId, t.col, (l) => {
    const n = [...l];
    n.splice(t.index ?? n.length, 0, block);
    return n;
  });
}

function mapBlock(list: Block[], id: string, fn: (b: Block) => Block): Block[] {
  return list.map((b) =>
    b.id === id ? fn(b) : b.children ? { ...b, children: b.children.map((c) => mapBlock(c, id, fn)) } : b,
  );
}

const cloneBlock = (b: Block): Block => ({
  ...b,
  id: uid(),
  props: { ...b.props },
  children: b.children?.map((c) => c.map(cloneBlock)),
});

interface BuilderState {
  blocks: Block[];
  selectedId: string | null;
  pageId: string | null;
  settings: Record<string, string>;
  setSetting: (key: string, value: string) => void;
  load: (blocks: Block[], settings?: Record<string, string>, pageId?: string) => void;
  add: (type: BlockType, target?: Target, cols?: number) => void;
  moveTo: (id: string, target: Target) => void;
  update: (id: string, key: string, value: string) => void;
  setCols: (id: string, n: number) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
}

export const useBuilder = create<BuilderState>((set) => ({
  blocks: [],
  selectedId: null,
  pageId: null,
  settings: {},
  setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
  load: (blocks, settings = {}, pageId) => set({ blocks, settings, pageId: pageId ?? null, selectedId: null }),
  add: (type, target, cols) =>
    set((s) => {
      const block = makeBlock(type, cols);
      const t = type === 'columns' && target?.parentId ? { parentId: null, col: 0 } : target ?? { parentId: null, col: 0 };
      return { blocks: insertAt(s.blocks, t, block), selectedId: block.id };
    }),
  moveTo: (id, target) =>
    set((s) => {
      const b = findBlock(s.blocks, id);
      if (!b) return s;
      if (b.type === 'columns' && target.parentId !== null) return s;
      if (target.parentId !== null && findBlock([b], target.parentId)) return s;
      return { blocks: insertAt(removeById(s.blocks, id), target, b) };
    }),
  update: (id, key, value) =>
    set((s) => ({ blocks: mapBlock(s.blocks, id, (b) => ({ ...b, props: { ...b.props, [key]: value } })) })),
  setCols: (id, n) =>
    set((s) => ({
      blocks: mapBlock(s.blocks, id, (b) => {
        const cur = b.children ?? [];
        const next: Block[][] = Array.from({ length: n }, (_, i) => cur[i] ?? []);
        if (cur.length > n) next[n - 1] = [...next[n - 1], ...cur.slice(n).flat()];
        return { ...b, props: { ...b.props, cols: String(n) }, children: next };
      }),
    })),
  duplicate: (id) =>
    set((s) => {
      const loc = findLoc(s.blocks, id);
      const b = findBlock(s.blocks, id);
      if (!loc || !b) return s;
      const copy = cloneBlock(b);
      return { blocks: insertAt(s.blocks, { ...loc, index: (loc.index ?? 0) + 1 }, copy), selectedId: copy.id };
    }),
  remove: (id) =>
    set((s) => ({ blocks: removeById(s.blocks, id), selectedId: s.selectedId === id ? null : s.selectedId })),
  select: (id) => set({ selectedId: id }),
}));