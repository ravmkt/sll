import { DeviceFrame } from '../components/DeviceFrame';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, pointerWithin, rectIntersection,
  useDraggable, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Copy, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import { BLOCKS } from '../registry';
import { renderBlock } from '../render';
import { PALETTE, type PaletteItem } from '../palette';
import { findBlock, findLoc, useBuilder, type Target } from '../store';
import { getPage, savePage } from '../services/pages';
import PublishBar from '../components/PublishBar';
import ProductPickerModal from '../components/ProductPickerModal';
import { brl } from '../services/products';
import type { Block, BlockType } from '../types';
import type { Field } from '../registry-extra';
import FieldInput from '../components/FieldInput';
import SuccessModal from '../components/SuccessModal';
import { fieldValue, productDescription } from '../styleKit';

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const list = (hits.length ? hits : rectIntersection(args)).filter((c) => c.id !== args.active.id);
  const area = (id: string | number) => {
    const r = args.droppableRects.get(id);
    return r ? r.width * r.height : 0;
  };
  return [...list].sort((a, b) => area(a.id) - area(b.id));
};

function PaletteTile({ item }: { item: PaletteItem }) {
  const add = useBuilder((s) => s.add);
  const Icon = item.icon;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.key}`,
    data: { from: 'palette', type: item.type, cols: item.cols, label: item.label },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => add(item.type, undefined, item.cols)}
      title={`${item.label} — clique ou arraste`}
      className={`flex cursor-grab flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#0094eb] hover:text-[#0094eb] ${isDragging ? 'opacity-40' : ''}`}
    >
      <Icon className="h-5 w-5" />
      <span className="leading-tight">{item.label}</span>
    </button>
  );
}

function ColumnDrop({ parentId, index, items }: { parentId: string; index: number; items: Block[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${parentId}:${index}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[96px] min-w-0 rounded-lg border-2 border-dashed p-1 transition-colors ${isOver ? 'border-[#0094eb] bg-[#0094eb]/5' : 'border-slate-300'}`}
    >
      <SortableContext items={items.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {items.map((b) => (
          <CanvasBlock key={b.id} block={b} />
        ))}
      </SortableContext>
      {items.length === 0 && (
        <p className="py-8 text-center text-xs font-medium text-slate-400">Solte um elemento aqui</p>
      )}
    </div>
  );
}

function ColumnsEditor({ block }: { block: Block }) {
  const cols = block.children ?? [];
  return (
    <div style={{ background: block.props.bg || undefined, padding: `${Number(block.props.pad) || 0}px` }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols.length || 1},minmax(0,1fr))`,
          gap: `${Number(block.props.gap) || 0}px`,
          alignItems: block.props.align || 'stretch',
        }}
      >
        {cols.map((items, i) => (
          <ColumnDrop key={i} parentId={block.id} index={i} items={items} />
        ))}
      </div>
    </div>
  );
}

function CanvasBlock({ block }: { block: Block }) {
  const selected = useBuilder((s) => s.selectedId === block.id);
  const select = useBuilder((s) => s.select);
  const remove = useBuilder((s) => s.remove);
  const duplicate = useBuilder((s) => s.duplicate);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : block.props.hidden === '1' ? 0.35 : 1 }}
      onClick={(e) => {
        e.stopPropagation();
        select(block.id);
      }}
      className={`group/b relative ${selected ? 'ring-2 ring-[#0094eb]' : 'hover:ring-1 hover:ring-slate-300'}`}
    >
      <div className={`absolute right-2 top-2 z-20 gap-1 ${selected ? 'flex' : 'hidden group-hover/b:flex'}`}>
        <button
          type="button"
          {...listeners}
          {...attributes}
          title="Arrastar"
          className="cursor-grab rounded-md bg-slate-800 p-1.5 text-white"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Duplicar"
          onClick={(e) => { e.stopPropagation(); duplicate(block.id); }}
          className="rounded-md bg-[#0094eb] p-1.5 text-white"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Excluir"
          onClick={(e) => { e.stopPropagation(); remove(block.id); }}
          className="rounded-md bg-red-600 p-1.5 text-white"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {block.props.hidden === '1' && <span className="absolute left-2 top-2 z-20 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white">OCULTO</span>}
          {block.type === 'columns' ? (
        <ColumnsEditor block={block} />
      ) : (
        <div className="pointer-events-none">{renderBlock(block)}</div>
      )}
    </div>
  );
}

function Canvas() {
  const blocks = useBuilder((s) => s.blocks);
  const select = useBuilder((s) => s.select);
  const { setNodeRef } = useDroppable({ id: 'canvas' });
  return (
    <div ref={setNodeRef} onClick={() => select(null)} className="min-h-[600px] bg-white shadow-sm">
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {blocks.map((b) => (
          <CanvasBlock key={b.id} block={b} />
        ))}
      </SortableContext>
      {blocks.length === 0 && (
        <p className="p-16 text-center text-sm font-medium text-slate-400">
          Arraste ou clique em um elemento à esquerda
        </p>
      )}
    </div>
  );
}

function PropertiesPanel() {
  const block = useBuilder((s) => findBlock(s.blocks, s.selectedId ?? ''));
  const update = useBuilder((s) => s.update);
  const setCols = useBuilder((s) => s.setCols);
  const duplicate = useBuilder((s) => s.duplicate);
  const remove = useBuilder((s) => s.remove);
  const [pick, setPick] = useState(false);
  const [open, setOpen] = useState<{ id: string; title: string } | null>(null);
  if (!block)
    return <p className="p-5 text-sm font-medium text-slate-500">Selecione um bloco para editar.</p>;
  const def = BLOCKS[block.type];
  const n = block.children?.length ?? 0;
  const hidden = block.props.hidden === '1';

  const plain: Field[] = [];
  const groups = new Map<string, Field[]>();
  for (const f of def.fields) {
    if (!f.group) plain.push(f);
    else groups.set(f.group, [...(groups.get(f.group) ?? []), f]);
  }

  const renderField = (f: Field) =>
    block.type === 'columns' && f.key === 'cols' ? (
      <div key={f.key}>
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">{f.label}</span>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCols(block.id, c)}
              className={`rounded-lg border py-2 text-sm font-bold transition-colors ${
                n === c ? 'border-[#0094eb] bg-[#0094eb] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0094eb]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <label key={f.key} className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">{f.label}</span>
        <FieldInput f={f} value={fieldValue(f, block.props)} onChange={(v) => update(block.id, f.key, v)} props={block.props} />
      </label>
    );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">{def.label}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            title={hidden ? 'Mostrar bloco' : 'Ocultar bloco'}
            onClick={() => update(block.id, 'hidden', hidden ? '' : '1')}
            className={`rounded-lg border p-1.5 ${hidden ? 'border-[#0094eb] text-[#0094eb]' : 'border-slate-200 text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]'}`}
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button type="button" title="Duplicar" onClick={() => duplicate(block.id)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]">
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" title="Excluir" onClick={() => remove(block.id)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {hidden && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
          Bloco oculto: não aparece na página publicada.
        </p>
      )}
      {block.type === 'product' && (
        <>
          <button
            type="button"
            onClick={() => setPick(true)}
            className="w-full rounded-xl bg-[#0094eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#007bc4]"
          >
            Escolher produto da loja
          </button>
          <ProductPickerModal
            open={pick}
            onClose={() => setPick(false)}
            onSelect={(p) => {
              update(block.id, 'name', p.name);
              update(block.id, 'image', p.image || block.props.image || '');
              update(block.id, 'price', brl(p.salePrice ?? p.price));
              update(block.id, 'desc', productDescription(p));
              if (p.url) update(block.id, 'href', p.url);
            }}
          />
        </>
      )}
      
      {[...(plain.length ? ([['Geral', plain]] as [string, Field[]][]) : []), ...groups.entries()].map(([title, list]) => {
            const isOpen = open?.id === block.id && open.title === title;
            return (
              <div key={`${block.id}-${title}`} className="rounded-lg border border-slate-200 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : { id: block.id, title })}
                  className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-700"
                >
                  <span className="text-[10px]">{isOpen ? '\u25BC' : '\u25B6'}</span>
                  {title}
                </button>
                {isOpen && <div className="space-y-3 border-t border-slate-200 p-3">{list.map(renderField)}</div>}
              </div>
            );
          })}
    </div>
  );
}
function resolveTarget(overId: string, blocks: Block[]): Target | null {
  if (overId === 'canvas') return { parentId: null, col: 0 };
  if (overId.startsWith('col:')) {
    const [, pid, c] = overId.split(':');
    return { parentId: pid, col: Number(c) };
  }
  return findLoc(blocks, overId);
}

export default function BuilderEditorPage() {
  const { id } = useParams();
  const blocks = useBuilder((s) => s.blocks);
  const load = useBuilder((s) => s.load);
  const add = useBuilder((s) => s.add);
  const moveTo = useBuilder((s) => s.moveTo);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [saved, setSaved] = useState(false);
  const [overlay, setOverlay] = useState<string | null>(null);
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

  function handleDragStart(e: DragStartEvent) {
    const d = e.active.data.current as { from?: string; label?: string } | undefined;
    if (d?.from === 'palette') return setOverlay(d.label ?? '');
    const b = findBlock(blocks, String(e.active.id));
    setOverlay(b ? BLOCKS[b.type].label : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setOverlay(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const t = resolveTarget(overId, blocks);
    if (!t) return;
    const data = active.data.current as { from?: string; type?: BlockType; cols?: number } | undefined;
    const isPalette = data?.from === 'palette' && !!data.type;
    const activeLoc = isPalette ? null : findLoc(blocks, String(active.id));
    const sameList = !!activeLoc && activeLoc.parentId === t.parentId && activeLoc.col === t.col;

    if (t.index !== undefined && !sameList) {
      const a = active.rect.current.translated;
      if (a && a.top + a.height / 2 > over.rect.top + over.rect.height / 2) t.index += 1;
    }
    if (isPalette) add(data!.type!, t, data!.cols);
    else moveTo(String(active.id), t);
  }

  async function handleSave() {
    if (!id) return;
    setStatus('Salvando...');
    try {
      await savePage(id, title, { blocks });
      setStatus('Salvo');
      setSaved(true);
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <Link to="/dashboard/modules/builder" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0094eb]">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/20"
        />
        <span className="text-sm text-slate-500">{status}</span>
        <PublishBar id={id!} title={title} />
        <button type="button" onClick={handleSave} className="rounded-xl bg-[#0094eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#007bc4]">
          Salvar
        </button>
      </header>
      <SuccessModal
        open={saved}
        onClose={() => setSaved(false)}
        title={'P\u00e1gina salva!'}
        message={'Suas altera\u00e7\u00f5es foram salvas com sucesso.'}
      />
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setOverlay(null)}>
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 space-y-5 overflow-y-auto border-r border-slate-200 bg-white p-4">
            {PALETTE.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-900">{g.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((it) => (
                    <PaletteTile key={it.key} item={it} />
                  ))}
                </div>
              </div>
            ))}
          </aside>
          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            <DeviceFrame><Canvas /></DeviceFrame>
          </main>
          <aside className="w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
            <PropertiesPanel />
          </aside>
        </div>
        <DragOverlay dropAnimation={null}>
          {overlay && (
            <div className="rounded-xl border border-[#0094eb] bg-white px-4 py-2 text-xs font-bold text-[#0094eb] shadow-xl">
              {overlay}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}