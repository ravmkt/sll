import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { DynamicPlan } from '@/services/admin/plansAdmin';
import type { Prices } from '@/services/admin/costsAdmin';

const sb: any = supabase;
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const after = (v: number, pct: number) => Math.round(v * (1 - pct / 100));

export default function ComboPricing({ combo, list, pct, onChanged }: { combo: DynamicPlan; list: Prices | null; pct: number; onChanged: () => void }) {
  const [val, setVal] = useState(String(pct).replace('.', ','));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(String(pct).replace('.', ',')); }, [pct]);

  const n = Number(val.replace(',', '.'));
  const valid = Number.isFinite(n) && n >= 0 && n <= 90;
  const dirty = valid && n !== pct;

  if (!list) return <p className="text-center text-[11px] text-rose-400">Defina 2 ou mais módulos com plano para precificar.</p>;

  const save = async () => {
    if (!valid) { toast.error('Informe um desconto entre 0 e 90.'); return; }
    setBusy(true);
    const { error } = await sb.rpc('admin_set_combo_discount_pct', { p_id: combo.id, p_pct: n, p_recalc: true });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Desconto aplicado ao combo.');
    onChanged();
  };

  const cols: [string, number, number][] = [
    ['Mensal', list.m, combo.price_monthly_cents],
    ['Semestral', list.s, combo.price_semiannual_cents],
    ['Anual', list.a, combo.price_annual_cents],
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        {cols.map(([name, full, cur]) => (
          <div key={name}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{name}</p>
            <p className="text-[10px] text-slate-500 line-through">{brl(full)}</p>
            <p className={`text-xs font-bold ${dirty ? 'text-sky-300' : 'text-white'}`}>{brl(dirty ? after(full, n) : cur)}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="text-[10px] text-slate-500">Desconto</span>
        <input value={val} onChange={(e) => setVal(e.target.value)}
          className="h-7 w-14 rounded-md border border-slate-700 bg-[#0b0e1a] px-2 text-right text-xs text-slate-100 outline-none focus:border-[#0094eb]" />
        <span className="text-xs text-slate-400">%</span>
        <button type="button" disabled={busy || !dirty} onClick={save}
          className="cursor-pointer rounded-md bg-[#0094eb] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40">
          {busy ? '…' : 'Aplicar'}
        </button>
      </div>
    </div>
  );
}