import { useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, RefreshCw, Trash2, Upload as UploadIcon } from 'lucide-react';
import type { Field } from '../registry-extra';
import { parseItems } from '../styleKit';
import { createPortal } from 'react-dom';
import ProductPickerModal from './ProductPickerModal';
import type { StoreProduct } from '../services/products';
import { ACCEPT, uploadBuilderAsset } from '../services/assets';

export const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/20';

type Items = Record<string, string>[];

const act = (fn: () => void) => (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  fn();
};

function Repeater({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const list: Items = parseItems(value);
  const [open, setOpen] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const endDrag = () => {
    setDrag(null);
    dragRef.current = null;
    setArmed(null);
    setOver(null);
  };
  const drop = (to: number) => {
    const from = dragRef.current;
    endDrag();
    if (from === null || from === to) return;
    const n = [...list];
    const [m] = n.splice(from, 1);
    n.splice(to, 0, m);
    set(n);
    setOpen(null);
  };
  const set = (next: Items) => onChange(JSON.stringify(next));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    set(n);
    setOpen(j);
  };
  const canAdd = !f.maxItems || list.length < f.maxItems;
  const ico = 'rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900';
  return (
    <div className="space-y-2">
      {list.map((it, i) => (
        <details
              key={i}
              open={open === i}
              draggable={armed === i}
              onMouseDown={(e) => setArmed((e.target as HTMLElement).closest('summary') ? i : null)}
              onDragStart={(e) => {
                e.stopPropagation();
                dragRef.current = i;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
                const sm = (e.currentTarget as HTMLElement).querySelector('summary');
                if (sm) e.dataTransfer.setDragImage(sm, 24, 16);
                setTimeout(() => { setDrag(i); setOpen(null); }, 0);
              }}
              onDragOver={(e) => {
                if (dragRef.current === null) return;
                e.preventDefault();
                setOver(i);
              }}
              onDrop={(e) => {
                if (dragRef.current === null) return;
                e.preventDefault();
                e.stopPropagation();
                drop(i);
              }}
              onDragEnd={endDrag}
              style={{
                opacity: drag === i ? 0.4 : 1,
                boxShadow:
                  over === i && dragRef.current !== null && dragRef.current !== i
                    ? dragRef.current < i ? '0 3px 0 0 #0094eb' : '0 -3px 0 0 #0094eb'
                    : undefined,
              }}
              onToggle={(e) => {
                const o = (e.currentTarget as HTMLDetailsElement).open;
                setOpen((cur) => (o ? i : cur === i ? null : cur));
              }}
              className="rounded-lg border border-slate-200 bg-slate-50"
            >
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700">
            <span>{f.itemLabel ?? 'Item'} {i + 1}</span>
            <span className="flex gap-0.5">
              <button type="button" title="Subir" onClick={act(() => move(i, -1))} className={ico}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Descer" onClick={act(() => move(i, 1))} className={ico}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Remover" onClick={act(() => { set(list.filter((_, k) => k !== i)); setOpen(null); })} className={`${ico} hover:!text-red-600`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </summary>
          <div className="space-y-3 border-t border-slate-200 p-3">
            {(f.item ?? []).map((sf) => (
              <label key={sf.key} className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">{sf.label}</span>
                <FieldInput
                  f={sf}
                  value={it[sf.key] ?? ''}
                  onChange={(v) => set(list.map((x, k) => (k === i ? { ...x, [sf.key]: v } : x)))}
                />
              </label>
            ))}
          </div>
        </details>
      ))}
      {canAdd && (
        <button
          type="button"
          onClick={() => { set([...list, { ...(f.itemDefaults ?? {}) }]); setOpen(list.length); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar {(f.itemLabel ?? 'item').toLowerCase()}
        </button>
      )}
    </div>
  );
}

function UploadField({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const kind = f.accept ?? 'image';
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      onChange(await uploadBuilderAsset(file, kind));
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Falha no envio');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={kind === 'video' ? 'Cole o link ou envie um arquivo' : 'Cole o link ou envie uma imagem'}
          className={INPUT}
        />
        <button
          type="button"
          disabled={busy}
          onClick={act(() => ref.current?.click())}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#0094eb] hover:text-[#0094eb] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadIcon className="h-3.5 w-3.5" />}
          {busy ? 'Enviando' : 'Enviar'}
        </button>
        <input ref={ref} type="file" accept={ACCEPT[kind]} className="hidden" onClick={(e) => e.stopPropagation()} onChange={pick} />
      </div>
      {kind === 'image' && /^https?:\/\//i.test(value) && (
        <img src={value} alt="" className="h-16 w-auto rounded border border-slate-200 object-cover" />
      )}
      {value && (
        <button type="button" onClick={act(() => onChange(''))} className="text-xs font-semibold text-slate-500 hover:text-red-600">
          Limpar
        </button>
      )}
      {err && <p className="text-xs font-medium text-red-600">{err}</p>}
    </div>
  );
}

function ProductsField({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const list: Items = parseItems(value);
  const [target, setTarget] = useState<number | null>(null);
  const set = (next: Items) => onChange(JSON.stringify(next));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    set(n);
  };
  const pick = (p: StoreProduct) => {
    const it = { id: p.id, n: p.name, p: p.price != null ? String(p.price) : '', s: p.salePrice != null ? String(p.salePrice) : '', i: p.image, u: p.url };
    if (target !== null && target >= 0 && target < list.length) {
      set(list.map((x, k) => (k === target ? it : x)));
    } else {
      if (list.some((x) => x.id === p.id)) return;
      set([...list, it]);
    }
  };
  const canAdd = !f.maxItems || list.length < f.maxItems;
  const ico = 'rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900';
  return (
    <div className="space-y-2">
      {list.map((it, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <button
            type="button"
            title="Clique para trocar o produto"
            onClick={act(() => setTarget(i))}
            className="flex min-w-0 flex-1 items-center gap-2 rounded text-left hover:bg-slate-100"
          >
            {it.i ? <img src={it.i} alt="" className="h-10 w-10 shrink-0 rounded object-cover" /> : <div className="h-10 w-10 shrink-0 rounded bg-slate-200" />}
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{it.n}</span>
          </button>
          <button type="button" title="Trocar produto" onClick={act(() => setTarget(i))} className={ico}><RefreshCw className="h-3.5 w-3.5" /></button>
          <button type="button" title="Subir" onClick={act(() => move(i, -1))} className={ico}><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" title="Descer" onClick={act(() => move(i, 1))} className={ico}><ArrowDown className="h-3.5 w-3.5" /></button>
          <button type="button" title="Remover" onClick={act(() => set(list.filter((_, k) => k !== i)))} className={`${ico} hover:!text-red-600`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      {canAdd && (
        <button
          type="button"
          onClick={act(() => setTarget(-1))}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar produto
        </button>
      )}
      <p className="text-[11px] text-slate-400">{'Clique em um produto para troc\u00e1-lo. Pre\u00e7o, foto e nome s\u00e3o atualizados ao publicar.'}</p>
      {target !== null && createPortal(
        <div onClick={(e) => e.stopPropagation()}>
          <ProductPickerModal open onClose={() => setTarget(null)} onSelect={pick} />
        </div>,
        document.body,
      )}
    </div>
  );
}
function RatioField({ value, onChange, n }: { value: string; onChange: (v: string) => void; n: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);

  if (n < 2) {
    return <p className="text-[11px] text-slate-400">Com 1 coluna n&atilde;o h&aacute; propor&ccedil;&atilde;o para ajustar.</p>;
  }

  const raw = (value || '').split(/[,:/\s]+/).map(Number).filter((x) => Number.isFinite(x) && x > 0);
  const w = raw.length === n ? raw : Array.from({ length: n }, () => 1);
  const total = w.reduce((a, c) => a + c, 0);
  const edges: number[] = [];
  let acc = 0;
  for (let i = 0; i < n - 1; i++) {
    acc += (w[i] / total) * 100;
    edges.push(Math.round(acc));
  }
  const parts = edges.map((e, i) => e - (i > 0 ? edges[i - 1] : 0));
  parts.push(100 - edges[n - 2]);

  const MIN = 10;
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag === null || !box.current) return;
    const r = box.current.getBoundingClientRect();
    if (r.width <= 0) return;
    const x = ((e.clientX - r.left) / r.width) * 100;
    const lo = (drag > 0 ? edges[drag - 1] : 0) + MIN;
    const hi = (drag < n - 2 ? edges[drag + 1] : 100) - MIN;
    const pos = Math.round(Math.min(Math.max(x, lo), hi));
    if (pos === edges[drag]) return;
    const ne = [...edges];
    ne[drag] = pos;
    const out = ne.map((v, i) => v - (i > 0 ? ne[i - 1] : 0));
    out.push(100 - ne[n - 2]);
    onChange(out.join(','));
  };
  const end = () => setDrag(null);

  return (
    <div className="space-y-2">
      <div
        ref={box}
        className="relative flex h-14 select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {parts.map((p, i) => (
          <div
            key={i}
            style={{ flexGrow: p, flexBasis: 0, minWidth: 0 }}
            className="m-1 flex items-center justify-center rounded bg-[#0094eb]/15 text-xs font-bold text-[#0094eb]"
          >
            {p}%
          </div>
        ))}
        {edges.map((e, i) => (
          <div
            key={i}
            title="Arraste para ajustar"
            style={{ left: e + '%' }}
            className="absolute top-0 h-full w-4 -translate-x-1/2 cursor-col-resize touch-none"
            onClick={(ev) => ev.stopPropagation()}
            onPointerDown={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              ev.currentTarget.setPointerCapture(ev.pointerId);
              setDrag(i);
            }}
          >
            <div className="mx-auto h-full w-1 rounded bg-[#0094eb]" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={parts.join(',')} className={INPUT} />
        <button
          type="button"
          onClick={act(() => onChange(''))}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#0094eb] hover:text-[#0094eb]"
        >
          Igualar
        </button>
      </div>
    </div>
  );
}

export default function FieldInput({ f, value, onChange, props }: { f: Field; value: string; onChange: (v: string) => void; props?: Record<string, string> }) {
  const type = f.type ?? (f.key === 'bg' || f.key === 'color' ? 'color' : f.key === 'endsAt' ? 'datetime' : 'text');
  if (!f.type && f.key === 'ratio') {
    const pc = Number(props?.cols);
    const guess = (value || '').split(/[,:/\s]+/).filter(Boolean).length;
    return <RatioField value={value} onChange={onChange} n={pc >= 1 && pc <= 4 ? pc : guess >= 2 ? guess : 2} />;
  }
  if (!f.type && /^URL da imagem/i.test(f.label)) return <UploadField f={f} value={value} onChange={onChange} />;
  if (type === 'repeater') return <Repeater f={f} value={value} onChange={onChange} />;
  if (type === 'upload') return <UploadField f={f} value={value} onChange={onChange} />;
  if (type === 'products') return <ProductsField f={f} value={value} onChange={onChange} />;
  if (f.multiline) return <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
  if (type === 'select')
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        {f.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  if (type === 'color')
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
        />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" className={INPUT} />
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-slate-500 hover:text-red-600">
            Limpar
          </button>
        )}
      </div>
    );
  if (type === 'number')
    {
      const mx = f.maxFn && props ? f.maxFn(props) : f.max;
      return (
        <input
          type="number"
          min={f.min}
          max={mx}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== '' && mx !== undefined && Number(v) > mx) onChange(String(mx));
            else onChange(v);
          }}
          className={INPUT}
        />
      );
    }
  if (type === 'datetime')
    return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
}