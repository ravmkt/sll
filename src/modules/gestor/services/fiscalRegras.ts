import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface FiscalProfile {
  id: string;
  name: string;
  ncm: string;
  cest: string | null;
  cfop: string | null;
  description: string | null;
  active: boolean;
  categories: number;
}

export interface FiscalForm {
  name: string;
  ncm: string;
  cest: string;
  cfop: string;
  description: string;
  active: boolean;
}

export interface CategoryFiscalRow {
  id: string;
  parent_id: string | null;
  fiscal_profile_id: string | null;
}

export interface ApplyResult {
  produtos_preenchidos: number;
  produtos_sem_ncm: number;
  variacoes_sem_ncm: number;
  produtos_sem_categoria: number;
}

export async function listFiscalProfiles(storeId: string): Promise<FiscalProfile[]> {
  const { data, error } = await sb.rpc('gestor_fiscal_profiles', { p_store: storeId });
  if (error) throw new Error(error.message);
  return (data || []) as FiscalProfile[];
}

export async function saveFiscalProfile(storeId: string, id: string | null, f: FiscalForm): Promise<void> {
  const { error } = await sb.rpc('gestor_fiscal_profile_save', {
    p_store: storeId, p_id: id, p_name: f.name, p_ncm: f.ncm, p_cest: f.cest,
    p_cfop: f.cfop, p_description: f.description, p_active: f.active,
  });
  if (error) throw new Error(error.message);
}

export async function listCategoryFiscal(storeId: string): Promise<CategoryFiscalRow[]> {
  const { data, error } = await sb.from('product_categories').select('id, parent_id, fiscal_profile_id').eq('store_id', storeId);
  if (error) throw new Error(error.message);
  return (data || []) as CategoryFiscalRow[];
}

export async function setCategoryFiscal(storeId: string, categoryId: string, profileId: string | null): Promise<void> {
  const { error } = await sb.rpc('gestor_category_set_fiscal', { p_store: storeId, p_category: categoryId, p_profile: profileId });
  if (error) throw new Error(error.message);
}

export async function applyFiscalRules(storeId: string): Promise<ApplyResult> {
  const { data, error } = await sb.rpc('gestor_fiscal_apply', { p_store: storeId });
  if (error) throw new Error(error.message);
  return data as ApplyResult;
}