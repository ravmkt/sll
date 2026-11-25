import { supabase } from '@/lib/supabase';

const sb: any = supabase;

/** Condicoes de pagamento pre-definidas da loja (ativas, na ordem). */
export async function listPaymentTerms(storeId: string): Promise<string[]> {
  const { data, error } = await sb
    .from('proposal_payment_terms')
    .select('name')
    .eq('store_id', storeId)
    .eq('active', true)
    .order('position', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message || 'Erro ao carregar condições de pagamento.');
  return ((data || []) as any[]).map((r) => r.name as string);
}