import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type MktCoupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type CouponDraft = {
  id?: string;
  code: string;
  value: string;
  max_uses: string;
  starts_at: string | null;
  expires_at: string | null;
};

export const emptyCouponDraft = (): CouponDraft => ({ code: '', value: '10', max_uses: '', starts_at: null, expires_at: null });

export async function listMktCoupons(): Promise<MktCoupon[]> {
  const { data, error } = await sb
    .from('discount_coupons')
    .select('id,code,discount_type,discount_value,max_uses,times_used,starts_at,expires_at,is_active,created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MktCoupon[];
}

export async function saveMktCoupon(d: CouponDraft): Promise<void> {
  const { error } = await sb.rpc('admin_coupon_save', {
    p_id: d.id ?? null,
    p_data: {
      code: d.code,
      discount_value: d.value.trim() === '' ? null : Number(d.value.replace(',', '.')),
      max_uses: d.max_uses.trim() === '' ? null : Number(d.max_uses),
      starts_at: d.starts_at,
      expires_at: d.expires_at,
    },
  });
  if (error) throw new Error(error.message);
}

export async function setMktCouponActive(id: string, active: boolean): Promise<void> {
  const { error } = await sb.rpc('admin_coupon_set_active', { p_id: id, p_active: active });
  if (error) throw new Error(error.message);
}

export async function deleteMktCoupon(id: string): Promise<void> {
  const { error } = await sb.rpc('admin_coupon_delete', { p_id: id });
  if (error) throw new Error(error.message);
}