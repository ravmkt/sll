import { useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload as UploadIcon } from 'lucide-react';
import type { Field } from '../registry-extra';
import { parseItems } from '../styleKit';
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
  const dragRef = useRef<number | null>(null);
  const endDrag = () => {
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
              style={over === i && dragRef.current !== null && dragRef.current !== i ? { outline: '2px solid #0094eb' } : undefined}
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

export default function FieldInput({ f, value, onChange, props }: { f: Field; value: string; onChange: (v: string) => void; props?: Record<string, string> }) {
  const type = f.type ?? (f.key === 'bg' || f.key === 'color' ? 'color' : f.key === 'endsAt' ? 'datetime' : 'text');
  if (type === 'repeater') return <Repeater f={f} value={value} onChange={onChange} />;
  if (type === 'upload') return <UploadField f={f} value={value} onChange={onChange} />;
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