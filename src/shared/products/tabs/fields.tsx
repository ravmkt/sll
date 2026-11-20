import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function NumInput({ value, onChange, step = 'any', placeholder, min = 0 }: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: string;
  placeholder?: string;
  min?: number;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}
