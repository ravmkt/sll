import { supabase } from '@/lib/supabase';

export type StartTrialDeniedReason = 'trial_used' | 'store_url_required' | 'domain_used';

export interface StartTrialResult {
  status: 'started' | 'already_active' | 'denied';
  module: string;
  reason?: StartTrialDeniedReason;
  trial_ends_at?: string;
}

export const TRIAL_DENIED_TEXT: Record<StartTrialDeniedReason, string> = {
  trial_used: 'O teste gratuito deste módulo já foi utilizado nesta loja.',
  store_url_required: 'Informe o endereço da sua loja no onboarding para iniciar o teste.',
  domain_used: 'O teste gratuito deste módulo já foi utilizado para este domínio.',
};

export async function startModuleTrial(storeId: string, moduleKey: string): Promise<StartTrialResult> {
  const { data, error } = await (supabase as any).rpc('start_module_trial', {
    p_store_id: storeId,
    p_module: moduleKey,
  });
  if (error) throw new Error(error.message);
  return data as StartTrialResult;
}