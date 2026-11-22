import { cn } from '@/lib/utils';
import { FULFILLMENT_LABEL } from '../services/pedidos';

export const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-600 text-white',
  separating: 'bg-violet-600 text-white',
  shipped: 'bg-teal-600 text-white',
  delivered: 'bg-emerald-600 text-white',
  canceled: 'bg-red-600 text-white',
};

export default function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold', STATUS_CLS[status] ?? STATUS_CLS.pending)}>
      {FULFILLMENT_LABEL[status] || status}
    </span>
  );
}