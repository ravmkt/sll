import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface Warehouse {
  id: string;
  name: string;
  kind: string;
  is_ecommerce: boolean;
  active: boolean;
}

export async function createCategory(storeId: string, name: string): Promise<string> {
  const { data, error } = await sb.rpc('gestor_category_save', {
    p_store: storeId, p_name: name, p_id: null, p_parent: null, p_active: true,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function createBrand(storeId: string, name: string): Promise<string> {
  const { data, error } = await sb.rpc('gestor_brand_save', {
    p_store: storeId, p_name: name, p_id: null, p_active: true,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function listWarehouses(storeId: string): Promise<Warehouse[]> {
  const { data, error } = await sb.rpc('gestor_warehouses', { p_store: storeId });
  if (error) throw new Error(error.message);
  return (data || []) as Warehouse[];
}

export async function saveWarehouse(
  storeId: string, name: string, kind: string, id: string | null, active: boolean,
): Promise<void> {
  const { error } = await sb.rpc('gestor_warehouse_save', {
    p_store: storeId, p_name: name, p_kind: kind, p_id: id, p_active: active,
  });
  if (error) throw new Error(error.message);
}