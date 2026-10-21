import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type Cycle = 'mensal' | 'semestral' | 'anual';
export type LandingCycle = { id: Cycle; label: string; off?: string };
export type LandingPlan = {
  id: string;
  name: string;
  tag: string;
  price: Record<Cycle, string>;
  billing: Record<Cycle, string>;
  features: string[];
  highlight?: boolean;
};

type State = { status: 'loading' | 'ready' | 'error'; plans: LandingPlan[]; cycles: LandingCycle[] };

const BASE_CYCLES: LandingCycle[] = [
  { id: 'mensal', label: 'Mensal' },
  { id: 'semestral', label: 'Semestral' },
  { id: 'anual', label: 'Anual' },
];

const TAGS: Record<string, string> = {
  starter: 'Para quem está começando',
  pro: 'Operação ativa',
  scale: 'Grandes lojas e alto tráfego',
};

const num = (v: unknown) => Number(v ?? 0) || 0;
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (v: number) => v.toLocaleString('pt-BR');
const discount = (monthly: number, total: number, months: number) =>
  monthly > 0 && total > 0 ? Math.round((1 - total / (monthly * months)) * 100) : 0;

function buildFeatures(l: any): string[] {
  const out: string[] = [];
  if (num(l?.max_videos) > 0) out.push(`Até ${int(num(l.max_videos))} vídeos ativos na loja`);
  if (num(l?.views) > 0) out.push(`Até ${int(num(l.views))} visualizações/mês`);
  if (num(l?.storage_gb) > 0) out.push(`${int(num(l.storage_gb))} GB de armazenamento`);
  if (num(l?.ai_messages) > 0) out.push(`${int(num(l.ai_messages))} mensagens de IA/mês`);
  if (l?.tracking) out.push('Métricas completas de receita e cliques');
  if (l?.badge_removable) out.push('Remoção da marca SLL do widget');
  return out;
}

export function useLandingPlans(): State {
  const [state, setState] = useState<State>({ status: 'loading', plans: [], cycles: BASE_CYCLES });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await sb
        .from('dynamic_plans')
        .select('id, plan_tier, plan_name, price_monthly_cents, price_semiannual_cents, price_annual_cents, limits_config, is_recommended, sort_order')
        .eq('is_active', true)
        .eq('is_combo', false)
        .eq('module_slug', 'vidlytics')
        .gt('price_monthly_cents', 0)
        .order('sort_order', { ascending: true });

      if (!alive) return;
      if (error || !data?.length) {
        if (error) console.error('[useLandingPlans]', error.message);
        setState({ status: 'error', plans: [], cycles: BASE_CYCLES });
        return;
      }

      const rows = data as any[];
      const plans: LandingPlan[] = rows.map((r) => {
        const m = num(r.price_monthly_cents);
        const s = num(r.price_semiannual_cents);
        const a = num(r.price_annual_cents);
        return {
          id: String(r.plan_tier),
          name: String(r.plan_name).replace(/^Vidlytics\s+/i, ''),
          tag: TAGS[r.plan_tier] ?? '',
          highlight: !!r.is_recommended,
          price: {
            mensal: brl(m),
            semestral: s > 0 ? brl(Math.round(s / 6)) : '—',
            anual: a > 0 ? brl(Math.round(a / 12)) : '—',
          },
          billing: {
            mensal: `R$ ${brl(m)} cobrado todo mês`,
            semestral: s > 0 ? `R$ ${brl(s)} a cada 6 meses` : 'Indisponível neste ciclo',
            anual: a > 0 ? `R$ ${brl(a)} por ano, em até 12x` : 'Indisponível neste ciclo',
          },
          features: buildFeatures(r.limits_config),
        };
      });

      const minOff = (key: 'price_semiannual_cents' | 'price_annual_cents', months: number) => {
        const v = rows.map((r) => discount(num(r.price_monthly_cents), num(r[key]), months)).filter((x) => x > 0);
        return v.length ? `${Math.min(...v)}% OFF` : undefined;
      };

      setState({
        status: 'ready',
        plans,
        cycles: [
          BASE_CYCLES[0],
          { ...BASE_CYCLES[1], off: minOff('price_semiannual_cents', 6) },
          { ...BASE_CYCLES[2], off: minOff('price_annual_cents', 12) },
        ],
      });
    })();
    return () => { alive = false; };
  }, []);

  return state;
}