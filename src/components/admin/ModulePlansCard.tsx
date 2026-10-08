import { useEffect, useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { listDynamicPlans, type DynamicPlan } from '@/services/admin/plansAdmin';
import { getPlanSubscribers } from '@/services/admin/pricingService';
import { CARD, brl, int } from '@/components/admin/moduleUi';

export default function ModulePlansCard({ slug, onManage }: { slug: string; onManage: () => void }) {
  const [plans, setPlans] = useState<DynamicPlan[] | null>(null);
  const [subs, setSubs] = useState<Record<string, number>>({});

  useEffect(() => {
    setPlans(null);
    Promise.all([listDynamicPlans(), getPlanSubscribers()])
      .then(([p, s]) => { setPlans(p.filter((x) => x.module_slug === slug)); setSubs(s); })
      .catch(() => setPlans([]));
  }, [slug]);

  return (
    <div className={`${CARD} space-y-3`}>
      <p className="flex items-center gap-2 text-sm font-bold text-white"><Tag size={14} className="text-[#fd8539]" /> Planos do módulo</p>
      {plans === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />
      ) : plans.length === 0 ? (
        <p className="text-xs text-slate-500">Este módulo ainda não tem planos.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{p.plan_name}</p>
                <p className="text-[11px] text-slate-500">{brl(p.price_monthly_cents)}/mês · {int(subs[p.id])} assinante(s)</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                {p.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onManage} className="w-full cursor-pointer rounded-lg bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/10">
        Gerenciar em Preços
      </button>
    </div>
  );
}