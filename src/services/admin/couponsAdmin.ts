import { supabase } from '@/lib/supabase';

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  applicable_plan_ids: string[] | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type CouponInput = {
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number | null;
  expires_at: string | null;
  applicable_plan_ids: string[];
  is_active: boolean;
};

export type PlanOption = { id: string; name: string };

export async function listCoupons(): Promise<Coupon[]> {
  const { data, error } = await (supabase as any)
    .from('discount_coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Coupon[];
}

export async function listPlanOptions(): Promise<PlanOption[]> {
  const { data, error } = await (supabase as any)
    .from('plans')
    .select('id,name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanOption[];
}

export async function saveCoupon(id: string | null, input: CouponInput): Promise<void> {
  const { error } = await (supabase as any).rpc('admin_save_coupon', { p_id: id, p_data: input });
  if (error) throw new Error(error.message);
}