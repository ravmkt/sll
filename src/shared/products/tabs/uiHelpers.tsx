import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';

export const DESCRIPTION_LIMIT = 10000;

export const selectCls =
  'flex h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Aceita "1234.56", "1234,56" e "1.234,56". */
export function parseDecimal(s: string): number | null {
  let t = s.trim().replace(/\s/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const fmt = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));

export function DecimalInput({ value, onChange, placeholder, id }: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
  id?: string;
}) {
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    if (parseDecimal(text) !== (value ?? null)) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      id={id}
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        if (!/^[0-9.,\s]*$/.test(v)) return;
        setText(v);
        onChange(parseDecimal(v));
      }}
    />
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}