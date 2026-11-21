import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export const sllFieldCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--sll-b-brand)] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export function SllField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function SllFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

export function SllSearch({
  label = 'Buscar', value, onChange, placeholder,
}: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <SllField label={label} className="min-w-[16rem] flex-1">
      <span className="relative block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(sllFieldCls, 'pl-9')} />
      </span>
    </SllField>
  );
}