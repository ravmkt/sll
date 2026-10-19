import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type Sort = { key: string; dir: 'asc' | 'desc' };

export default function SortTh({ label, k, sort, onSort, className = '', align = 'left' }: {
  label: string; k: string; sort: Sort; onSort: (s: Sort) => void; className?: string; align?: 'left' | 'center';
}) {
  const on = sort.key === k;
  const Icon = !on ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2.5 ${align === 'center' ? 'text-center' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort({ key: k, dir: on && sort.dir === 'desc' ? 'asc' : 'desc' })}
        className={`inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${on ? 'text-[#0094eb]' : 'text-slate-500 hover:text-[#0094eb]'} ${className}`}
      >
        {label} <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}