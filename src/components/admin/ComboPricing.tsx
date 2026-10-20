import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { DynamicPlan } from '@/services/admin/plansAdmin';
import type { Prices } from '@/services/admin/costsAdmin';
import { cycleInfo } from '@/components/admin/cycleInfo';

const sb: any = supabase;
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlReais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const after = (v: number, pct: number) => Math.round(v * (1 - pct / 100));
const pctTxt = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`;

export type PriceGuard = {
  cost: number | null;
  maxPct: number | null;
  worstAt: (pct: number) => number | null;
};

export default function ComboPricing({ combo, list, pct, onChanged, guard }: { combo: DynamicPlan; list: Prices | null; pct: number; onChanged: () => void; guard?: PriceGuard }) {
  const [val, setVal] = useState(String(pct).replace('.', ','));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(String(pct).replace('.', ',')); }, [pct]);

  const n = Number(val.replace(',', '.'));
  const valid = Number.isFinite(n) && n >= 0 && n <= 90;
  const dirty = valid && n !== pct;

  if (!list) return <p className="text-center text-[13px] text-rose-400">Defina 2 ou mais módulos com plano para precificar.</p>;

  const shown = valid ? n : pct;
  const worst = guard ? guard.worstAt(shown) : null;
  const blocked = valid && guard != null && worst !== null && worst < 0;

  const save = async () => {
    if (!valid) { toast.error('Informe um desconto entre 0 e 90.'); return; }
    if (blocked) { toast.error('Esse desconto deixa o combo no prejuízo para um cliente que usa 100% dos limites.'); return; }
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{name}</p>
            <p className="text-xs text-slate-500 line-through">{brl(full)}</p>
            <p className={`text-[13px] font-bold ${dirty ? 'text-sky-300' : 'text-white'}`}>{brl(dirty ? after(full, n) : cur)}</p>
            {name !== 'Mensal' && (() => {
              const v = dirty ? after(full, n) : cur;
              const m0 = dirty ? after(cols[0][1], n) : cols[0][2];
              const t = cycleInfo(v, name === 'Semestral' ? 6 : 12, m0);
              return t ? <p className="text-xs text-emerald-400">{t}</p> : null;
            })()}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-slate-500">Desconto</span>
        <input value={val} onChange={(e) => setVal(e.target.value)}
          className="h-7 w-14 rounded-md border border-slate-700 bg-[#0b0e1a] px-2 text-right text-[13px] text-slate-100 outline-none focus:border-[#0094eb]" />
        <span className="text-[13px] text-slate-400">%</span>
        <button type="button" disabled={busy || !dirty || blocked} onClick={save}
          className="cursor-pointer rounded-md bg-[#0094eb] px-3 py-1 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? '…' : 'Aplicar'}
        </button>
      </div>

      {guard && (
        <div className="space-y-1 rounded-lg bg-white/5 p-2 text-center text-xs">
          {guard.cost === null ? (
            <p className="text-amber-300">Há limite ilimitado em algum módulo: o custo não tem teto e não dá para garantir a margem por cliente.</p>
          ) : (
            <>
              <p className="text-slate-400">
                Pior caso por cliente (100% dos limites, só custo variável):{' '}
                <b className={worst !== null && worst < 0 ? 'text-rose-300' : 'text-emerald-300'}>{worst === null ? '—' : pctTxt(worst)}</b>
                {' '}· custo máx. {brlReais(guard.cost)}/mês
              </p>
              {guard.maxPct !== null && (
                <p className="text-slate-300">
                  Desconto máximo seguro: <b className="text-white">{String(guard.maxPct).replace('.', ',')}%</b>{' '}
                  {valid && n !== guard.maxPct && (
                    <button type="button" onClick={() => setVal(String(guard.maxPct).replace('.', ','))} className="cursor-pointer font-bold text-[#0094eb] hover:underline">usar</button>
                  )}
                </p>
              )}
              {blocked && (
                <p className="font-semibold text-rose-300">
                  {guard.maxPct === 0 && (guard.worstAt(0) ?? 0) < 0
                    ? 'Mesmo sem desconto, um cliente no limite máximo gera prejuízo. Revise os limites ou o preço dos planos.'
                    : 'Bloqueado: com esse desconto um cliente que usa 100% dos limites dá prejuízo.'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}