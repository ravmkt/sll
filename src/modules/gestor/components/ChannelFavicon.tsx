import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CHANNEL_META } from '../services/canais';
import type { ChannelKey } from '../services/canais';

const FILE: Record<ChannelKey, string> = {
  yampi: 'yampi',
  mercado_livre: 'mercadolivre',
  tiktok: 'tiktok',
  instagram: 'instagram',
};

export function normChannel(c: string): ChannelKey | null {
  const k = c.replace('mercadolivre', 'mercado_livre');
  return k in CHANNEL_META ? (k as ChannelKey) : null;
}

type Props = { channel: ChannelKey; pending?: boolean; size?: number; className?: string };

export default function ChannelFavicon({ channel, pending, size = 20, className }: Props) {
  const [broken, setBroken] = useState(false);
  const m = CHANNEL_META[channel];
  const title = pending ? `${m.label} (aguardando publicação)` : m.label;

  if (broken) {
    return (
      <span
        title={title}
        style={{ backgroundColor: m.color, width: size, height: size }}
        className={cn('flex shrink-0 items-center justify-center rounded text-[10px] font-extrabold text-white', pending && 'opacity-40', className)}
      >
        {m.letter}
      </span>
    );
  }
  return (
    <img
      src={`/assets/platforms/fav-${FILE[channel]}.png`}
      alt={m.label}
      title={title}
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className={cn('shrink-0 rounded', pending && 'opacity-40 grayscale', className)}
    />
  );
}