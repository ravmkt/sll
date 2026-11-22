import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export interface Supplier {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  lead_time_days: number | null;
  payment_terms: string | null;
  notes: string | null;
  active: boolean;
  legal_name?: string | null;
  person_type?: string | null;
  ie?: string | null;
  ie_indicator?: number | null;
  im?: string | null;
  tax_regime?: string | null;
  zip?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  ibge_code?: string | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  pix_key?: string | null;
}

export interface SupplierForm {
  name: string;
  document: string;
  email: string;
  phone: string;
  contact_name: string;
  lead_time_days: string;
  payment_terms: string;
  notes: string;
  active: boolean;
  // Campos novos: se vierem undefined, nao sao enviados e o valor salvo e mantido
  legal_name?: string;
  person_type?: string;
  ie?: string;
  ie_indicator?: string;
  im?: string;
  tax_regime?: string;
  zip?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  ibge_code?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
}

export interface LowStockRow {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  title: string | null;
  stock: number;
  min_stock: number;
}

const EXTRA_KEYS = [
  'legal_name', 'person_type', 'ie', 'im', 'tax_regime', 'zip', 'street', 'number', 'complement',
  'district', 'city', 'state', 'ibge_code', 'bank_name', 'bank_agency', 'bank_account', 'pix_key',
] as const;

export async function listSuppliers(storeId: string): Promise<Supplier[]> {
  const { data, error } = await sb.rpc('gestor_suppliers', { p_store: storeId });
  if (error) throw error;
  return (data || []) as Supplier[];
}

export async function saveSupplier(storeId: string, id: string | null, f: SupplierForm): Promise<void> {
  const lead = f.lead_time_days.trim() === '' ? null : Math.max(0, Math.floor(Number(f.lead_time_days)));
  const data: Record<string, unknown> = {
    name: f.name,
    document: f.document,
    email: f.email,
    phone: f.phone,
    contact_name: f.contact_name,
    lead_time_days: Number.isFinite(lead as number) ? lead : null,
    payment_terms: f.payment_terms,
    notes: f.notes,
    active: f.active,
  };
  for (const k of EXTRA_KEYS) if (f[k] !== undefined) data[k] = f[k];
  if (f.ie_indicator !== undefined) data.ie_indicator = f.ie_indicator === '' ? null : Number(f.ie_indicator);

  const { error } = await sb.rpc('gestor_supplier_save2', { p_store: storeId, p_id: id, p_data: data });
  if (error) throw error;
}

export async function listLowStock(storeId: string): Promise<LowStockRow[]> {
  const { data, error } = await sb.rpc('gestor_low_stock', { p_store: storeId });
  if (error) throw error;
  return (data || []) as LowStockRow[];
}