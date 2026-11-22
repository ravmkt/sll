import { cn } from '@/lib/utils';
import { sllFieldCls } from './SllFilterBar';

export type PeriodPreset = 'all' | 'today' | '7' | '30' | '90' | 'custom';
export type PeriodValue = { preset: PeriodPreset; from: string; to: string };
export const PERIOD_ALL: PeriodValue = { preset: 'all', from: '', to: '' };

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'custom', label: 'Personalizado' },
];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Intervalo em ISO: from inclusivo, to exclusivo. */
export function periodRange(v: PeriodValue): { from: string | null; to: string | null } {
  const today = dayStart(new Date());
  const tomorrow = addDays(today, 1);
  if (v.preset === 'all') return { from: null, to: null };
  if (v.preset === 'today') return { from: today.toISOString(), to: tomorrow.toISOString() };
  if (v.preset === 'custom') {
    return {
      from: v.from ? parseYmd(v.from).toISOString() : null,
      to: v.to ? addDays(parseYmd(v.to), 1).toISOString() : null,
    };
  }
  return { from: addDays(today, -(Number(v.preset) - 1)).toISOString(), to: tomorrow.toISOString() };
}

type Props = { value: PeriodValue; onChange: (v: PeriodValue) => void; label?: string };

export function SllPeriodFilter({ value, onChange, label = 'Período' }: Props) {
  return (
    <div>
      <span className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.key === 'custom' ? { ...value, preset: 'custom' } : { preset: p.key, from: '', to: '' })}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                value.preset === p.key
                  ? 'bg-[color:var(--sll-b-brand)] text-white'
                  : 'text-slate-500 hover:text-[color:var(--sll-b-brand)] dark:text-slate-300',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {value.preset === 'custom' && (
          <>
            <input type="date" aria-label="De" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className={cn(sllFieldCls, 'w-40')} />
            <span className="text-xs text-slate-400">até</span>
            <input type="date" aria-label="Até" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className={cn(sllFieldCls, 'w-40')} />
          </>
        )}
      </div>
    </div>
  );
}