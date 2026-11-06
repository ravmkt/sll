import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BLOCKS, BLOCK_TYPES } from '../registry';
import { useBuilder } from '../store';
import { getPage, savePage } from '../services/pages';
import PublishBar from '../components/PublishBar';
import type { Block, BlockType } from '../types';

function PaletteItem({ type }: { type: BlockType }) {
  const add = useBuilder((s) => s.add);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { from: 'palette', type },
  });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => add(type)}
      className={`w-full rounded-md border bg-white px-3 py-2 text-left text-sm hover:border-emerald-500 ${isDragging ? 'opacity-40' : ''}`}
    >
      {BLOCKS[type].label}
    </button>
  );
}

function CanvasBlock({ block }: { block: Block }) {
  const selectedId = useBuilder((s) => s.selectedId);
  const select = useBuilder((s) => s.select);
  const remove = useBuilder((s) => s.remove);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const selected = selectedId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => select(block.id)}
      className={`group relative ${selected ? 'ring-2 ring-emerald-500' : 'hover:ring-1 hover:ring-gray-300'}`}
    >
      <div className="absolute right-2 top-2 z-10 hidden gap-1 group-hover:flex">
        <button {...listeners} {...attributes} className="cursor-grab rounded bg-gray-800 px-2 py-1 text-xs text-white">
          Mover
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            remove(block.id);
          }}
          className="rounded bg-red-600 px-2 py-1 text-xs text-white"
        >
          Excluir
        </button>
      </div>
      <div className="pointer-events-none">{BLOCKS[block.type].render(block.props)}</div>
    </div>
  );
}

function Canvas() {
  const blocks = useBuilder((s) => s.blocks);
  const select = useBuilder((s) => s.select);
  const { setNodeRef } = useDroppable({ id: 'canvas' });
  return (
    <div ref={setNodeRef} onClick={() => select(null)} className="min-h-[600px] bg-white shadow">
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {blocks.map((b) => (
          <CanvasBlock key={b.id} block={b} />
        ))}
      </SortableContext>
      {blocks.length === 0 && (
        <p className="p-16 text-center text-gray-400">Arraste ou clique em um elemento à esquerda</p>
      )}
    </div>
  );
}

function PropertiesPanel() {
  const block = useBuilder((s) => s.blocks.find((b) => b.id === s.selectedId));
  const update = useBuilder((s) => s.update);
  if (!block) return <p className="p-4 text-sm text-gray-500">Selecione um bloco para editar.</p>;
  const def = BLOCKS[block.type];
  return (
    <div className="space-y-3 p-4">
      <h3 className="font-semibold">{def.label}</h3>
      {def.fields.map((f) => (
        <label key={f.key} className="block text-sm">
          <span className="mb-1 block text-gray-600">{f.label}</span>
          {f.multiline ? (
            <textarea
              rows={4}
              value={block.props[f.key] ?? ''}
              onChange={(e) => update(block.id, f.key, e.target.value)}
              className="w-full rounded border p-2"
            />
          ) : (
            <input
              value={block.props[f.key] ?? ''}
              onChange={(e) => update(block.id, f.key, e.target.value)}
              className="w-full rounded border p-2"
            />
          )}
        </label>
      ))}
    </div>
  );
}

export default function BuilderEditorPage() {
  const { id } = useParams();
  const blocks = useBuilder((s) => s.blocks);
  const load = useBuilder((s) => s.load);
  const add = useBuilder((s) => s.add);
  const move = useBuilder((s) => s.move);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!id) return;
    getPage(id)
      .then((p) => {
        setTitle(p.title);
        load(p.content?.blocks ?? []);
      })
      .catch((e) => setStatus(e.message));
  }, [id, load]);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as { from?: string; type?: BlockType } | undefined;
    const overIndex = blocks.findIndex((b) => b.id === over.id);

    if (data?.from === 'palette' && data.type) {
      add(data.type, overIndex >= 0 ? overIndex : undefined);
      return;
    }
    const from = blocks.findIndex((b) => b.id === active.id);
    if (from >= 0 && overIndex >= 0 && from !== overIndex) move(from, overIndex);
  }

  async function handleSave() {
    if (!id) return;
    setStatus('Salvando...');
    try {
      await savePage(id, title, { blocks });
      setStatus('Salvo');
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="flex items-center gap-4 border-b bg-white px-4 py-2">
        <Link to="/builder" className="text-sm text-gray-500 hover:underline">← Voltar</Link>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 rounded border px-3 py-1 font-medium" />
        <span className="text-sm text-gray-500">{status}</span>
        <PublishBar id={id!} title={title} />
        <button onClick={handleSave} className="rounded-md bg-emerald-600 px-4 py-2 text-white">Salvar</button>
      </header>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1">
          <aside className="w-56 space-y-2 overflow-y-auto border-r bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Elementos</p>
            {BLOCK_TYPES.map((t) => (
              <PaletteItem key={t} type={t} />
            ))}
          </aside>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl">
              <Canvas />
            </div>
          </main>
          <aside className="w-72 overflow-y-auto border-l bg-white">
            <PropertiesPanel />
          </aside>
        </div>
      </DndContext>
    </div>
  );
}

