import type { HTMLAttributes, ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { CARD, ModuleLogo, int } from '@/components/admin/moduleUi';
import { brlCents } from '@/services/admin/modulesRevenue';

export const BTN = 'cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40';

const DOT = { green: 'bg-emerald-500', yellow: 'bg-yellow-400', gray: 'bg-slate-500' } as const;

type Props = {
  kind: 'combo' | 'module';
  dot: { color: keyof typeof DOT; tip: string };
  logos: { url: string | null; name: string }[];
  title: string;
  subtitle?: string;
  stats: { total: number; trial: number; paying: number };
  revenue: number;
  actions: ReactNode;
  onOpen?: () => void;
  dnd?: HTMLAttributes<HTMLDivElement>;
  dim?: boolean;
  highlight?: boolean;
};

export default function ItemCard({ kind, dot, logos, title, subtitle, stats, revenue, actions, onOpen, dnd, dim, highlight }: Props) {
  const accent = kind === 'combo' ? 'shadow-[inset_4px_0_0_0_#facc15]' : 'shadow-[inset_4px_0_0_0_#0094eb]';
  const stat = (label: string, v: number, cls: string) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-xl font-black ${cls}`}>{int(v)}</p>
    </div>
  );
  return (
    <div
      {...dnd}
      className={`${CARD} relative flex flex-col items-center gap-3 ${accent} ${dim ? 'opacity-40' : ''} ${highlight ? 'ring-2 ring-[#fd8539]/60' : ''}`}
    >
      <span title={dot.tip} className={`absolute left-3 top-3 h-3 w-3 cursor-help rounded-full ${DOT[dot.color]}`} />
      {dnd?.draggable && <GripVertical size={16} title="Arraste para mudar a ordem" className="absolute right-2 top-2 cursor-grab text-slate-600 active:cursor-grabbing" />}

      <div onClick={onOpen} className={`flex w-full flex-col items-center gap-2 ${onOpen ? 'cursor-pointer' : ''}`}>
        <div className="flex h-12 items-center justify-center gap-2">
          {logos.slice(0, 3).map((l, i) => <ModuleLogo key={i} url={l.url} name={l.name} size={44} />)}
        </div>
        <p className="max-w-full truncate text-[15px] font-bold text-white" title={title}>{title}</p>
        {subtitle && <p className="max-w-full truncate text-xs text-amber-200/80" title={subtitle}>{subtitle}</p>}
      </div>

      <div className="grid w-full grid-cols-3 text-center">
        {stat('Lojas', stats.total, 'text-[#fd8539]')}
        {stat('Trial', stats.trial, 'text-amber-300')}
        {stat('Pagantes', stats.paying, 'text-emerald-300')}
      </div>

      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Receita no período</p>
        <p className="text-lg font-black text-emerald-400">{brlCents(revenue)}</p>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-1.5 border-t border-white/5 pt-3">{actions}</div>
    </div>
  );
}