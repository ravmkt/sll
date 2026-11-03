import BillingProfileCard from '@/components/billing/BillingProfileCard';
import InvoiceHistory from '@/components/billing/InvoiceHistory';
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLoja } from "@/contexts/LojaContext";
import {
  getActiveSubscriptions,
  type StoreSubscription,
} from "@/services/subscriptions/getStoreSubscriptions";
import { SubscriptionModuleCard } from "@/components/assinaturas/SubscriptionModuleCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import MyAddonsCard from "@/components/billing/MyAddonsCard";
import NoahPackModal from "@/components/billing/NoahPackModal";

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, semiannual: 6, yearly: 12, annual: 12 };

export default function Assinaturas() {
  const { user } = useAuth();
  const { storeId } = useLoja();
  const [subscriptions, setSubscriptions] = useState<StoreSubscription[]>([]);
  const [billingAnchorDay, setBillingAnchorDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [packOpen, setPackOpen] = useState(searchParams.get("addon") === "ai_messages");

  async function load() {
    if (!storeId) return;
    setLoading(true);

    const [subs, storeInfo] = await Promise.all([
      getActiveSubscriptions(storeId),
      supabase.from("stores").select("billing_anchor_day").eq("id", storeId).maybeSingle(),
    ]);

    setSubscriptions(subs);
    setBillingAnchorDay(storeInfo.data?.billing_anchor_day ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  // Total mensal: cada assinatura (plano + complementos) dividida pelos meses do ciclo
  const totalMensalCents = subscriptions.reduce((acc, s) => {
    if (s.status === "canceled" || !s.plan) return acc;
    const months = CYCLE_MONTHS[String(s.billing_cycle)] ?? 1;
    return acc + Math.round(s.plan.price_cents / months);
  }, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#0094eb]/20 border-t-[#0094eb] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8 pb-20">
        {storeId && packOpen && <NoahPackModal storeId={storeId} onClose={() => { setPackOpen(false); setSearchParams({}, { replace: true }); }} />}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{"Minhas Assinaturas"}</h1>
            <p className="text-sm font-medium text-slate-500">
              {"Gerencie os m\u00f3dulos assinados individualmente. Voc\u00ea pode fazer upgrade ou downgrade de cada um sem afetar os demais."}
            </p>
            {billingAnchorDay && (
              <p className="mt-1 text-xs font-bold text-slate-400">
                {"Vencimento unificado: todo dia " + billingAnchorDay}
              </p>
            )}
          </div>
          <Link
            to="/dashboard/planos"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0091ff] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-[#0070f3] transition"
          >
            <PlusCircle size={16} />
            {"Assinar novo m\u00f3dulo"}
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-sm font-bold text-slate-500">{"Voc\u00ea ainda n\u00e3o tem nenhuma assinatura ativa."}</p>
            <Link to="/dashboard/planos" className="mt-3 inline-block text-sm font-black text-[#0091ff] hover:underline">
              {"Ver m\u00f3dulos dispon\u00edveis \u2192"}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {subscriptions.map((sub) => (
                <SubscriptionModuleCard key={sub.id} sub={sub} onCanceled={load} />
              ))}
            </div>

            {storeId && <MyAddonsCard storeId={storeId} />}

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">{"Total consolidado mensal"}</p>
                <p className="text-2xl font-black text-slate-900">
                  {"R$ " + (totalMensalCents / 100).toFixed(2).replace(".", ",")}
                </p>
              </div>
              <p className="max-w-xs text-right text-xs font-semibold text-slate-500">
                {"Cobrado em uma \u00fanica fatura, sempre na mesma data de vencimento, independente de quantos m\u00f3dulos voc\u00ea tiver."}
              </p>
            </div>
          </>
        )}

        <BillingProfileCard />
        <InvoiceHistory />
      </div>
    </DashboardLayout>
  );
}