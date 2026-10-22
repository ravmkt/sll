import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import ModuloPlanoModal from '@/components/planos/ModuloPlanoModal';
import {
  getCatalogModules,
  getCatalogShowcase,
  type CatalogModule,
  type CatalogPlan,
} from '@/services/plans/getCatalogShowcase';

function ModulePlanModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { storeId } = useLoja();
  const [plans, setPlans] = useState<CatalogPlan[] | null>(null);
  const [mod, setMod] = useState<CatalogModule | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const db = supabase as any;
      const [list, mods] = await Promise.all([getCatalogShowcase(), getCatalogModules()]);
      const mine = list.filter((p) => p.module_slug === slug);
      let t: string | null = null;
      if (storeId && mine.length) {
        const { data: sub } = await db
          .from('subscriptions')
          .select('dynamic_plan_id')
          .eq('store_id', storeId)
          .eq('module_key', slug)
          .eq('is_current', true)
          .in('status', ['active', 'past_due', 'lifetime'])
          .limit(1)
          .maybeSingle();
        if (sub?.dynamic_plan_id) {
          const { data: dp } = await db.from('dynamic_plans').select('plan_tier').eq('id', sub.dynamic_plan_id).maybeSingle();
          t = dp?.plan_tier ? String(dp.plan_tier).toLowerCase() : null;
        }
      }
      if (!alive) return;
      if (!mine.length) {
        onClose();
        navigate(`/dashboard/planos?modulo=${slug}`);
        return;
      }
      setMod(mods.find((m) => m.slug === slug) ?? null);
      setTier(t);
      setPlans(mine);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, storeId]);

  if (!plans) return null;
  return (
    <ModuloPlanoModal
      slug={slug}
      name={mod?.name || slug}
      logoUrl={mod?.logo_url ?? null}
      plans={plans}
      initialCycle="monthly"
      currentTier={tier}
      onClose={onClose}
    />
  );
}

export default function SubscribeModalButton({ slug, className, children }: { slug: string; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <ModulePlanModal slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}