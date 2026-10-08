import type { Margin } from '@/services/admin/costsAdmin';

const STYLE: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-300',
  warn: 'bg-amber-500/15 text-amber-300',
  low: 'bg-orange-500/15 text-orange-300',
  loss: 'bg-rose-500/20 text-rose-300',
  na: 'bg-slate-500/15 text-slate-400',
};
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(0)}%`);
const brl = (v: number | null) => (v === null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export default function MarginBadge({ m }: { m: Margin | null }) {
  if (!m) return <span className="text-slate-600">—</span>;
  if (m.level === 'na') {
    return <span title={m.reason || 'Sem dados para calcular'} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STYLE.na}`}>Indef.</span>;
  }
  const label = m.level === 'loss' ? `Prejuízo (${pct(m.worst)})` : pct(m.worst);
  const title = `Pior caso (100% do limite): margem ${pct(m.worst)}, custo ${brl(m.costWorst)}\nUso realista: margem ${pct(m.real)}, custo ${brl(m.costReal)}`;
  return (
    <div className="inline-flex flex-col items-center" title={title}>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STYLE[m.level]}`}>{label}</span>
      <span className="mt-0.5 text-[9px] text-slate-500">real {pct(m.real)}</span>
    </div>
  );
}