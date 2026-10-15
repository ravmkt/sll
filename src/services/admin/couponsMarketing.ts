import { supabase } from '@/lib/supabase';

const sb: any = supabase;

export type CouponType = 'percentage' | 'fixed_amount';
export type CouponDuration = 'first_invoice' | 'months' | 'forever';

export type MktCoupon = {
  id: string;
  code: string;
  discount_type: CouponType;
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  starts_at: string | null;
  expires_at: string | null;
  applicable_plan_ids: string[] | null;
  is_active: boolean;
  created_at: string;
  duration_type: CouponDuration | null;
  duration_months: number | null;
};

export type CouponDraft = {
  id?: string;
  code: string;
  discount_type: CouponType;
  value: string;
  max_uses: string;
  starts_at: string | null;
  expires_at: string | null;
  applicable_plan_ids: string[];
  duration_type: CouponDuration;
  duration_months: string;
};

export type CouponPlanOption = { id: string; name: string; group: string; groupLabel: string };

const MODULE_LABEL: Record<string, string> = { vidlytics: 'Vidlytics', live_commerce: 'Stream Sell' };

export const emptyCouponDraft = (): CouponDraft => ({
  code: '', discount_type: 'percentage', value: '10', max_uses: '', starts_at: null, expires_at: null,
  applicable_plan_ids: [], duration_type: 'first_invoice', duration_months: '',
});

export const couponToDraft = (c: MktCoupon): CouponDraft => ({
  id: c.id,
  code: c.code,
  discount_type: c.discount_type,
  value: c.discount_type === 'percentage' ? String(c.discount_value) : (c.discount_value / 100).toFixed(2).replace('.', ','),
  max_uses: c.max_uses === null ? '' : String(c.max_uses),
  starts_at: c.starts_at,
  expires_at: c.expires_at,
  applicable_plan_ids: c.applicable_plan_ids ?? [],
  duration_type: c.duration_type ?? 'forever',
  duration_months: c.duration_months ? String(c.duration_months) : '',
});

export async function listMktCoupons(): Promise<MktCoupon[]> {
  const { data, error } = await sb
    .from('discount_coupons')
    .select('id,code,discount_type,discount_value,max_uses,times_used,starts_at,expires_at,applicable_plan_ids,is_active,created_at,duration_type,duration_months')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MktCoupon[];
}

export async function listCouponPlanOptions(): Promise<CouponPlanOption[]> {
  const { data, error } = await sb
    .from('dynamic_plans')
    .select('id,plan_name,module_slug,is_combo,is_active')
    .eq('is_active', true)
    .order('is_combo', { ascending: false })
    .order('module_slug', { ascending: true })
    .order('plan_name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id as string,
    name: String(p.plan_name),
    group: p.is_combo ? '__combos' : String(p.module_slug),
    groupLabel: p.is_combo ? 'Combos' : (MODULE_LABEL[p.module_slug] ?? String(p.module_slug)),
  }));
}

export async function saveMktCoupon(d: CouponDraft): Promise<void> {
  const raw = Number(d.value.replace(',', '.'));
  const val = d.value.trim() === '' || !Number.isFinite(raw)
    ? null
    : d.discount_type === 'percentage' ? Math.round(raw) : Math.round(raw * 100);
  const { error } = await sb.rpc('admin_coupon_save', {
    p_id: d.id ?? null,
    p_data: {
      code: d.code,
      discount_type: d.discount_type,
      discount_value: val,
      max_uses: d.max_uses.trim() === '' ? null : Number(d.max_uses),
      starts_at: d.starts_at,
      expires_at: d.expires_at,
      applicable_plan_ids: d.applicable_plan_ids,
      duration_type: d.duration_type,
      duration_months: d.duration_type === 'months' && d.duration_months.trim() !== '' ? Number(d.duration_months) : null,
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