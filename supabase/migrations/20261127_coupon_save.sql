create or replace function public.admin_coupon_save(p_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_code text := upper(btrim(coalesce(p_data->>'code', '')));
  v_type text := coalesce(nullif(p_data->>'discount_type', ''), 'percentage');
  v_val int := nullif(p_data->>'discount_value', '')::int;
  v_max int := nullif(p_data->>'max_uses', '')::int;
  v_start timestamptz := nullif(p_data->>'starts_at', '')::timestamptz;
  v_end timestamptz := nullif(p_data->>'expires_at', '')::timestamptz;
  v_dur text := coalesce(nullif(p_data->>'duration_type', ''), 'forever');
  v_dur_m int := nullif(p_data->>'duration_months', '')::int;
  v_has_ids boolean := p_data ? 'applicable_plan_ids';
  v_ids uuid[] := null;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if v_code = '' then raise exception 'Informe o código do cupom.'; end if;
  if v_type not in ('percentage', 'fixed_amount') then raise exception 'Tipo de desconto inválido.'; end if;
  if v_type = 'percentage' and (v_val is null or v_val < 1 or v_val > 100) then
    raise exception 'O desconto deve ficar entre 1 e 100%%.';
  end if;
  if v_type = 'fixed_amount' and (v_val is null or v_val < 100) then
    raise exception 'O valor fixo deve ser de pelo menos R$ 1,00.';
  end if;
  if v_dur not in ('first_invoice', 'months', 'forever') then raise exception 'Duração inválida.'; end if;
  if v_dur = 'months' and (v_dur_m is null or v_dur_m < 1 or v_dur_m > 60) then
    raise exception 'Informe de 1 a 60 meses.';
  end if;
  if v_dur <> 'months' then v_dur_m := null; end if;
  if v_max is not null and v_max < 1 then raise exception 'O limite de usos deve ser 1 ou mais.'; end if;
  if v_start is not null and v_end is not null and v_end <= v_start then raise exception 'O fim da validade deve ser depois do início.'; end if;

  if v_has_ids and jsonb_typeof(p_data->'applicable_plan_ids') = 'array'
     and jsonb_array_length(p_data->'applicable_plan_ids') > 0 then
    select array_agg(x::uuid) into v_ids from jsonb_array_elements_text(p_data->'applicable_plan_ids') x;
  end if;

  if p_id is null then
    insert into public.discount_coupons (code, discount_type, discount_value, max_uses, starts_at, expires_at, applicable_plan_ids, is_active, duration_type, duration_months)
    values (v_code, v_type, v_val, v_max, v_start, v_end, v_ids, true, v_dur, v_dur_m)
    returning id into v_id;
  else
    update public.discount_coupons
       set code = v_code, discount_type = v_type, discount_value = v_val,
           max_uses = v_max, starts_at = v_start, expires_at = v_end,
           duration_type = v_dur, duration_months = v_dur_m,
           applicable_plan_ids = case when v_has_ids then v_ids else applicable_plan_ids end
     where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Cupom não encontrado.'; end if;
  end if;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), case when p_id is null then 'coupon_created' else 'coupon_updated' end,
          jsonb_build_object('coupon_id', v_id, 'code', v_code, 'type', v_type, 'duration', v_dur, 'plan_ids', v_ids));
  return v_id;
exception when unique_violation then
  raise exception 'Já existe um cupom com o código %.', v_code;
end;
$function$;