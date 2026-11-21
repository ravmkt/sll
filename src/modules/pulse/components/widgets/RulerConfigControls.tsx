import { useState, type ReactNode } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';

const box = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[color:var(--sll-b-brand)]';

export function Section({ n, title, open, onToggle, children }: { n: number; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-slate-50">
        <h4 className="text-[13px] font-semibold text-slate-700">{n}. {title}</h4>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3 border-t border-slate-100 p-3.5">{children}</div>}
    </div>
  );
}

export function Sub({ children }: { children: ReactNode }) {
  return <div className="border-b border-slate-100 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</div>;
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function NumField({ label, value, onChange, min = 0, max = 100, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = () => {
    if (draft !== null) {
      const n = parseFloat(draft.replace(',', '.'));
      if (!Number.isNaN(n)) onChange(clamp(n));
      setDraft(null);
    }
  };
  const bump = (d: number) => onChange(clamp(parseFloat((value + d).toFixed(2))));
  const btn = 'flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => bump(-step)}><Minus className="h-3 w-3" /></button>
          <input
            inputMode="decimal"
            value={draft ?? String(value)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="h-7 w-14 rounded-md border border-slate-200 text-center text-xs font-semibold text-slate-700 outline-none focus:border-[color:var(--sll-b-brand)]"
          />
          <button type="button" className={btn} onClick={() => bump(step)}><Plus className="h-3 w-3" /></button>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value)))}
        className="w-full accent-[#0094EB]" />
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="color" value={valid ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className={`${box} min-w-0 px-2 font-mono text-xs uppercase`} />
      </div>
    </label>
  );
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-[#0094EB]" />
      {label}
    </label>
  );
}

export function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={box}>
        {options.map(([v, n]) => <option key={n} value={v}>{n}</option>)}
      </select>
    </label>
  );
}

export function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`h-9 flex-1 rounded-lg border text-xs font-bold transition-colors ${active ? 'border-[color:var(--sll-b-brand)] bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
      {children}
    </button>
  );
}