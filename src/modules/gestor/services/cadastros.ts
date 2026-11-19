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

export async function listSuppliers(storeId: string): Promise<Supplier[]> {
  const { data, error } = await sb.rpc('gestor_suppliers', { p_store: storeId });
  if (error) throw error;
  return (data || []) as Supplier[];
}

export async function saveSupplier(storeId: string, id: string | null, f: SupplierForm): Promise<void> {
  const lead = f.lead_time_days.trim() === '' ? null : Math.max(0, Math.floor(Number(f.lead_time_days)));
  const { error } = await sb.rpc('gestor_supplier_save', {
    p_store: storeId,
    p_name: f.name,
    p_id: id,
    p_document: f.document,
    p_email: f.email,
    p_phone: f.phone,
    p_contact: f.contact_name,
    p_lead_time: Number.isFinite(lead as number) ? lead : null,
    p_terms: f.payment_terms,
    p_notes: f.notes,
    p_active: f.active,
  });
  if (error) throw error;
}

export async function listLowStock(storeId: string): Promise<LowStockRow[]> {
  const { data, error } = await sb.rpc('gestor_low_stock', { p_store: storeId });
  if (error) throw error;
  return (data || []) as LowStockRow[];
}