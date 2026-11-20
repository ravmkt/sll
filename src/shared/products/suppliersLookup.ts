import { supabase } from '@/lib/supabase';

export interface SupplierOption {
  id: string;
  name: string;
}

/** Lista fornecedores do Gestor (erp.suppliers). Se o schema nao estiver exposto, devolve lista vazia. */
export async function listSupplierOptions(storeId: string): Promise<SupplierOption[]> {
  const { data, error } = await supabase.schema('erp').from('suppliers').select('*').eq('store_id', storeId);
  if (error) return [];
  return (data ?? [])
    .map((s: Record<string, unknown>) => ({
      id: String(s.id),
      name: String(s.name ?? s.trade_name ?? s.legal_name ?? s.company_name ?? 'Sem nome'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
