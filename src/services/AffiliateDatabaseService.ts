import { supabase } from "@/lib/supabase";

export interface AffiliateSummary {
  total_generated: number;
  available_balance: number;
  total_referred_stores: number;
}

export interface AffiliateReferredDetail {
  referred_store_name: string;
  plan_price_cents: number | null;
  period_reference: string | null;
  commission_amount: number;
  status: string;
  created_at: string;
}

export type ReferralStatus = "trial" | "trial_expired" | "paid" | "past_due" | "canceled" | "other";

export interface ReferralDetail {
  store_id: string;
  subscription_id: string | null;
  product_key: string | null;
  product_name: string | null;
  plan_name: string | null;
  store_name: string;
  joined_at: string;
  trial_ends_at: string | null;
  canceled_at: string | null;
  status: ReferralStatus;
  commission_pending: number;
  commission_released: number;
  commission_canceled: number;
  next_release_at: string | null;
}
export interface RequestWithdrawalParams {
  storeId: string;
  amount: number;
  pixKey: string;
  pixKeyType: string;
}

export class AffiliateDatabaseService {
  static async getSummary(storeId: string): Promise<AffiliateSummary> {
    const { data: rewards, error: rewardsError } = await supabase
      .from("referral_rewards")
      .select("amount, status, referred_store_id")
      .eq("referrer_store_id", storeId);

    if (rewardsError) {
      console.error("Erro ao buscar referral_rewards:", rewardsError);
      return { total_generated: 0, available_balance: 0, total_referred_stores: 0 };
    }

    const totalGenerated = (rewards || [])
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const referredStores = new Set((rewards || []).map((r) => r.referred_store_id));

    const referredCount = new Set((await AffiliateDatabaseService.getReferralDetails(storeId)).map((d) => d.store_id)).size;

    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from("affiliate_withdrawals")
      .select("amount, status")
      .eq("store_id", storeId);

    if (withdrawalsError) {
      console.error("Erro ao buscar affiliate_withdrawals:", withdrawalsError);
    }

    const totalWithdrawn = (withdrawals || [])
      .filter((w) => ["pending", "approved", "paid"].includes(w.status))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    return {
      total_generated: totalGenerated,
      available_balance: Math.max(totalGenerated - totalWithdrawn, 0),
      total_referred_stores: referredCount,
    };
  }

  static async getReferredDetails(storeId: string): Promise<AffiliateReferredDetail[]> {
    const { data, error } = await supabase
      .from("referral_rewards")
      .select(`
        amount,
        status,
        period_reference,
        plan_price_cents,
        created_at,
        referred_store:referral_rewards_referred_store_id_fkey ( name )
      `)
      .eq("referrer_store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar detalhes de indicados:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      referred_store_name: r.referred_store?.name || "Loja indicada",
      plan_price_cents: r.plan_price_cents,
      period_reference: r.period_reference,
      commission_amount: Number(r.amount || 0),
      status: r.status,
      created_at: r.created_at,
    }));
  }

  static async getReferralDetails(_storeId: string): Promise<ReferralDetail[]> {
    const { data, error } = await supabase.rpc("get_my_referral_details");
    if (error) {
      console.error("Erro ao buscar indicados:", error);
      return [];
    }
    return ((data as any[]) || []).map((r) => ({
      store_id: r.store_id,
      subscription_id: r.subscription_id ?? null,
      product_key: r.product_key ?? null,
      product_name: r.product_name ?? null,
      plan_name: r.plan_name ?? null,
      store_name: r.store_name || "Loja indicada",
      joined_at: r.joined_at,
      trial_ends_at: r.trial_ends_at ?? null,
      canceled_at: r.canceled_at ?? null,
      status: r.status,
      commission_pending: Number(r.commission_pending || 0),
      commission_released: Number(r.commission_released || 0),
      commission_canceled: Number(r.commission_canceled || 0),
      next_release_at: r.next_release_at ?? null,
    }));
  }
  static async requestWithdrawal(params: RequestWithdrawalParams): Promise<void> {
    const { storeId, amount, pixKey, pixKeyType } = params;

    const { error } = await supabase.from("affiliate_withdrawals").insert({
      store_id: storeId,
      amount,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      status: "pending",
      requested_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Erro ao solicitar saque:", error);
      throw error;
    }
  }
}

