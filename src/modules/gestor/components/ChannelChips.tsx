import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHANNEL_META } from '../services/estoqueCanais';
import type { Availability } from '../services/estoqueCanais';

export function TotalCell({ ids, avail, compact, onTransfer }: {
  ids: string[]; avail: Availability; compact?: boolean; onTransfer?: () => void;
}) {
  const total = ids.reduce((s, id) => s + (avail.byVariant.get(id)?.total ?? 0), 0);
  return (
    <td className={cn('px-4 text-center', compact ? 'py-2' : 'py-2.5')}>
      <div className="inline-flex items-center gap-1.5">
        <span className={cn('font-mono', compact ? 'text-xs' : 'text-sm')}>{total}</span>
        {onTransfer && (
          <button type="button" title="Transferir entre depósitos" onClick={onTransfer} className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-[#0094eb] dark:hover:bg-slate-800">
            <ArrowLeftRight size={13} />
          </button>
        )}
      </div>
    </td>
  );
}

export function ChannelsCell({ ids, avail, compact }: { ids: string[]; avail: Availability; compact?: boolean }) {
  const chips = avail.channels
    .map((ch) => {
      let physical = 0, available = 0, seen = false;
      for (const id of ids) {
        const c = avail.byVariant.get(id)?.ch[ch];
        if (c) { physical += c.physical; available += c.available; seen = true; }
      }
      return { ch, physical, available, seen };
    })
    .filter((c) => c.seen);
  return (
    <td className={cn('px-4', compact ? 'py-2' : 'py-2.5')}>
      <div className="flex flex-wrap justify-center gap-1">
        {chips.map((c) => (
          <span
            key={c.ch}
            title={`Disponível no canal: ${c.available}. Saldo físico considerado: ${c.physical}.`}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              c.available <= 0 ? 'bg-rose-50 text-rose-600' : c.available < c.physical ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            {CHANNEL_META[c.ch]?.short ?? c.ch} {c.available}{c.available < c.physical ? ` de ${c.physical}` : ''}
          </span>
        ))}
      </div>
    </td>
  );
}