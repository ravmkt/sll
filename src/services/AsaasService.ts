import { supabase } from "@/lib/supabase";

export interface CreateAsaasSubscriptionPayload {
  store_id: string;
  plan_id: string;
  customer: {
    name: string;
    cpfCnpj: string;
    email: string;
    mobilePhone?: string;
  };
  billingType: "BOLETO" | "PIX" | "CREDIT_CARD";
  value: number;
  cycle: "MONTHLY" | "YEARLY" | "WEEKLY" | "QUARTERLY" | "SEMIANNUALLY" | "BIWEEKLY";
  nextDueDate: string;
  description?: string;
}

export const AsaasService = {
  async createSubscription(payload: CreateAsaasSubscriptionPayload) {
    const { data, error } = await supabase.functions.invoke("asaas-create-subscription", {
      body: payload,
    });

    if (error) {
      console.error("Erro ao criar assinatura Asaas:", error);
      throw error;
    }

    return data;
  },
};
