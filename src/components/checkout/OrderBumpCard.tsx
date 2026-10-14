import { useEffect, useMemo, useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type Cycle = 'monthly' | 'semiannual' | 'yearly';
export const CYCLE_MONTHS: Record<Cycle, number> = { monthly: 1, semiannual: 6, yearly: 12 };

export interface Upsell {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  scope: string;
  upsell_headline: string | null;
  upsell_module_target: string | null;
}

const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Add-ons de upsell compativeis com os modulos que estao sendo assinados
export function useUpsells(modules: string[]) {
  const [items, setItems] = useState<Upsell[]>([]);
  const key = modules.join('|');

  useEffect(() => {
    let alive = true;
    sb.from('addons')
      .select('id,name,description,price_monthly,scope,upsell_headline,upsell_module_target')
      .eq('is_active', true)
      .eq('is_upsell', true)
      .order('price_monthly')
      .then(({ data }: any) => {
        if (!alive) return;
        const mods = key ? key.split('|') : [];
        setItems(
          ((data || []) as any[])
            .map((r) => ({ ...r, price_monthly: Number(r.price_monthly) }) as Upsell)
            .filter((a) => (a.scope === 'global' || mods.includes(a.scope)) && (a.upsell_module_target === 'all' || (a.upsell_module_target && mods.includes(a.upsell_module_target)))),
        );
      });
    return () => { alive = false; };
  }, [key]);

  return items;
}

// Valor extra a cobrar no ciclo escolhido, em reais
export const bumpTotal = (items: Upsell[], selected: Set<string>, cycle: Cycle) =>
  items.filter((a) => selected.has(a.id)).reduce((s, a) => s + a.price_monthly * CYCLE_MONTHS[cycle], 0);

export default function OrderBumpCard({ modules, cycle, selected, onChange }: {
  modules: string[]; cycle: Cycle; selected: Set<string>; onChange: (next: Set<string>) => void;
}) {
  const items = useUpsells(modules);
  const months = CYCLE_MONTHS[cycle];
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };
  const total = useMemo(() => bumpTotal(items, selected, cycle), [items, selected, cycle]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const on = selected.has(a.id);
        return (
          <button key={a.id} type="button" onClick={() => toggle(a.id)}
            className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border-2 border-dashed p-4 text-left transition-colors ${on ? 'border-[#fd8539] bg-[#fd8539]/10' : 'border-[#fd8539]/50 bg-white hover:bg-[#fd8539]/5'}`}>
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-[#fd8539] bg-[#fd8539] text-white' : 'border-slate-300 bg-white'}`}>
              {on && <Check size={13} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-black text-slate-900"><Zap size={14} className="text-[#fd8539]" /> {a.upsell_headline || a.name}</span>
              <span className="mt-0.5 block text-xs text-slate-600">{a.name}{a.description ? `: ${a.description}` : ''}</span>
              <span className="mt-1 block text-xs font-bold text-[#c2571a]">
                {brl(a.price_monthly)}/mês{months > 1 ? ` · ${brl(a.price_monthly * months)} a cada ${months} meses` : ''}
              </span>
            </span>
          </button>
        );
      })}
      {total > 0 && <p className="text-right text-xs font-semibold text-slate-600">Total dos add-ons neste ciclo: {brl(total)}</p>}
    </div>
  );
}