import { cn } from '@/lib/utils';
import { CHANNEL_META } from '../services/canais';
import type { ChannelKey, LinkStatus } from '../services/canais';

type Props = { channel: ChannelKey; status?: LinkStatus; className?: string };

export default function ChannelIcon({ channel, status = 'published', className }: Props) {
  const m = CHANNEL_META[channel];
  const pending = status === 'pending';
  const title = pending ? `${m.label} (aguardando publicação)` : m.label;
  return (
    <span
      title={title}
      aria-label={title}
      style={{ backgroundColor: m.color }}
      className={cn(
        'inline-flex h-4 w-4 shrink-0 cursor-default items-center justify-center rounded-full text-[9px] font-extrabold leading-none',
        channel === 'mercado_livre' ? 'text-slate-900' : 'text-white',
        pending && 'opacity-40 grayscale',
        className,
      )}
    >
      {m.letter}
    </span>
  );
}
