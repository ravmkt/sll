import { cn } from '@/lib/utils';
import { FULFILLMENT_LABEL } from '../services/pedidos';

export const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  separating: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  shipped: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  canceled: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
};

export default function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold', STATUS_CLS[status] ?? STATUS_CLS.pending)}>
      {FULFILLMENT_LABEL[status] || status}
    </span>
  );
}