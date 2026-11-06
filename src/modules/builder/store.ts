import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import type { Block, BlockType } from './types';
import { BLOCKS } from './registry';

interface BuilderState {
  blocks: Block[];
  selectedId: string | null;
  load: (blocks: Block[]) => void;
  add: (type: BlockType, index?: number) => void;
  move: (from: number, to: number) => void;
  update: (id: string, key: string, value: string) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
}

export const useBuilder = create<BuilderState>((set) => ({
  blocks: [],
  selectedId: null,
  load: (blocks) => set({ blocks, selectedId: null }),
  add: (type, index) =>
    set((s) => {
      const block: Block = { id: crypto.randomUUID(), type, props: { ...BLOCKS[type].defaults } };
      const blocks = [...s.blocks];
      blocks.splice(index ?? blocks.length, 0, block);
      return { blocks, selectedId: block.id };
    }),
  move: (from, to) => set((s) => ({ blocks: arrayMove(s.blocks, from, to) })),
  update: (id, key, value) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)),
    })),
  remove: (id) =>
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),
  select: (id) => set({ selectedId: id }),
}));
