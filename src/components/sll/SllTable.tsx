import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SllColumn<T> = {
  key: string;
  header: ReactNode;
  /** Quando definido, o título da coluna fica clicável para ordenar. */
  sortKey?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render: (row: T) => ReactNode;
};

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

type Props<T> = {
  columns: SllColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: string;
  minWidth?: string;
  sort?: { key: string; dir: 'asc' | 'desc' };
  onSort?: (key: string) => void;
};

export function SllTable<T>({ columns, rows, rowKey, onRowClick, loading, empty = 'Nenhum registro.', minWidth = '44rem', sort, onSort }: Props<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" style={{ minWidth }}>
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800">
            <tr>
              {columns.map((c) => (
                <th
                      key={c.key}
                      aria-sort={c.sortKey && sort?.key === c.sortKey ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn('px-3 py-2.5', ALIGN[c.align ?? 'left'], c.className)}
                    >
                      {c.sortKey && onSort ? (
                        <button
                          type="button"
                          onClick={() => onSort(c.sortKey as string)}
                          title="Clique para ordenar"
                          className={cn(
                            'group inline-flex cursor-pointer items-center gap-1 font-bold uppercase tracking-wider transition-colors hover:text-[color:var(--sll-b-brand)]',
                            sort?.key === c.sortKey && 'text-[color:var(--sll-b-brand)]',
                          )}
                        >
                          {c.header}
                          {sort?.key === c.sortKey
                            ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
                            : <ChevronsUpDown size={12} className="opacity-40 group-hover:opacity-100" />}
                        </button>
                      ) : c.header}
                    </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn('align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-800', onRowClick && 'cursor-pointer')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-2.5', ALIGN[c.align ?? 'center'], c.className)}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-[color:var(--sll-b-brand)]" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm font-medium text-slate-500">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const pageBtn =
  'cursor-pointer rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';

/** page é base 0 */
export function SllPager({ page, pages, total, noun = 'registro(s)', onPage }: {
  page: number; pages: number; total: number; noun?: string; onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs font-medium text-slate-500">
      <span>{total} {noun} · Página {page + 1} de {pages}</span>
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Anterior" className={pageBtn}><ChevronLeft size={16} /></button>
      <button type="button" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Próxima" className={pageBtn}><ChevronRight size={16} /></button>
    </div>
  );
}