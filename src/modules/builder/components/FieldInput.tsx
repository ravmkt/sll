import type { MouseEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { Field } from '../registry-extra';
import { parseItems } from '../styleKit';

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
  const set = (next: Items) => onChange(JSON.stringify(next));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    set(n);
  };
  const canAdd = !f.maxItems || list.length < f.maxItems;
  const ico = 'rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900';
  return (
    <div className="space-y-2">
      {list.map((it, i) => (
        <details key={i} className="rounded-lg border border-slate-200 bg-slate-50">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700">
            <span>{f.itemLabel ?? 'Item'} {i + 1}</span>
            <span className="flex gap-0.5">
              <button type="button" title="Subir" onClick={act(() => move(i, -1))} className={ico}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Descer" onClick={act(() => move(i, 1))} className={ico}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Remover" onClick={act(() => set(list.filter((_, k) => k !== i)))} className={`${ico} hover:!text-red-600`}>
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
          onClick={() => set([...list, { ...(f.itemDefaults ?? {}) }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar {(f.itemLabel ?? 'item').toLowerCase()}
        </button>
      )}
    </div>
  );
}

export default function FieldInput({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const type = f.type ?? (f.key === 'bg' || f.key === 'color' ? 'color' : f.key === 'endsAt' ? 'datetime' : 'text');
  if (type === 'repeater') return <Repeater f={f} value={value} onChange={onChange} />;
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
    return <input type="number" min={f.min} max={f.max} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
  if (type === 'datetime')
    return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
}