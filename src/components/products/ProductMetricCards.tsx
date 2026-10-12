import { Ban, CheckCircle2, Link2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  total: number;
  active: number;
  inactive: number;
  linked: number;
  loading?: boolean;
}

export default function ProductMetricCards({ total, active, inactive, linked, loading }: Props) {
  const items = [
    { label: 'Total de produtos', value: total, Icon: Package, box: 'bg-slate-100 dark:bg-slate-800', icon: 'text-slate-600 dark:text-slate-300' },
    { label: 'Ativos', value: active, Icon: CheckCircle2, box: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-500' },
    { label: 'Inativos', value: inactive, Icon: Ban, box: 'bg-rose-50 dark:bg-rose-950/30', icon: 'text-rose-500' },
    { label: 'Vinculados a vídeo', value: linked, Icon: Link2, box: 'bg-[#0094eb]/10', icon: 'text-[#0094eb]' },
  ];

  return (
    <div data-tour="prod-metricas" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, Icon, box, icon }) => (
        <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2c] px-5 py-4">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', box)}>
            <Icon size={18} className={icon} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-xl font-semibold text-slate-800 dark:text-white">{loading ? '—' : value.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}