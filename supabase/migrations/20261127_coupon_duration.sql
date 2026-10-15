alter table public.discount_coupons
  add column if not exists duration_type text not null default 'forever'
    check (duration_type in ('first_invoice','months','forever')),
  add column if not exists duration_months integer
    check (duration_months is null or duration_months > 0);

create or replace function public.validate_coupon(p_code text, p_plan_id uuid default null::uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare c public.discount_coupons;
begin
  select * into c from public.discount_coupons where upper(code) = upper(btrim(p_code));
  if not found or not c.is_active then return jsonb_build_object('valid', false, 'reason', 'not_found'); end if;
  if c.starts_at is not null and c.starts_at > now() then return jsonb_build_object('valid', false, 'reason', 'not_started'); end if;
  if c.expires_at is not null and c.expires_at < now() then return jsonb_build_object('valid', false, 'reason', 'expired'); end if;
  if c.max_uses is not null and c.times_used >= c.max_uses then return jsonb_build_object('valid', false, 'reason', 'exhausted'); end if;
  if c.applicable_plan_ids is not null and cardinality(c.applicable_plan_ids) > 0
     and (p_plan_id is null or not (p_plan_id = any(c.applicable_plan_ids))) then
    return jsonb_build_object('valid', false, 'reason', 'plan_not_allowed');
  end if;
  return jsonb_build_object(
    'valid', true, 'type', c.discount_type, 'value', c.discount_value, 'coupon_id', c.id,
    'duration_type', c.duration_type, 'duration_months', c.duration_months
  );
end;
$function$;