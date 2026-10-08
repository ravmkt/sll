import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type ModuleOverview = {
  slug: string;
  name: string;
  status: string;
  is_public_for_sale: boolean;
  sort_order: number;
  access: number;
  paying: number;
  trial: number;
  past_due: number;
  lifetime: number;
  mrr: number;
  errors: number;
  events: number | null;
  views: number | null;
  clicks: number | null;
  active_stores: number | null;
  videos: number | null;
  storage_bytes: number | null;
};

export type ModulesData = { days: number; modules: ModuleOverview[]; bundle_stores: number; bundle_mrr: number };

export type ModuleStoreRow = { id: string; name: string | null; status: string; billing_cycle: string | null; plan_name: string | null; via_combo: boolean };

export async function getModulesOverview(days: number): Promise<ModulesData> {
  const { data, error } = await sb.rpc('admin_master_modules', { p_days: days });
  if (error) throw new Error(error.message);
  return data as ModulesData;
}

export async function getModuleStores(slug: string): Promise<ModuleStoreRow[]> {
  const { data, error } = await sb.rpc('admin_module_stores', { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data || []) as ModuleStoreRow[];
}

export async function updateHubModule(slug: string, name: string, status: string, isPublic: boolean, sort: number): Promise<void> {
  const { error } = await sb.rpc('admin_update_hub_module', {
    p_slug: slug, p_name: name, p_status: status, p_public: isPublic, p_sort: sort,
  });
  if (error) throw new Error(error.message);
}