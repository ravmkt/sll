alter table public.discount_coupons add column if not exists starts_at timestamptz;

-- cupons criados com lista vazia bloqueavam todos os planos: vazio = todos
update public.discount_coupons set applicable_plan_ids = null
where applicable_plan_ids is not null and cardinality(applicable_plan_ids) = 0;

create or replace function public.validate_coupon(p_code text, p_plan_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
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
  return jsonb_build_object('valid', true, 'type', c.discount_type, 'value', c.discount_value, 'coupon_id', c.id);
end;
$$;
grant execute on function public.validate_coupon(text, uuid) to authenticated;

create or replace function public.redeem_coupon(p_coupon_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with u as (
    update public.discount_coupons
       set times_used = times_used + 1
     where id = p_coupon_id and is_active
       and (max_uses is null or times_used < max_uses)
       and (starts_at is null or starts_at <= now())
       and (expires_at is null or expires_at > now())
    returning 1
  )
  select exists (select 1 from u);
$$;
revoke all on function public.redeem_coupon(uuid) from public, anon, authenticated;
grant execute on function public.redeem_coupon(uuid) to service_role;

create or replace function public.admin_coupon_save(p_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text := upper(btrim(coalesce(p_data->>'code', '')));
  v_val int := nullif(p_data->>'discount_value', '')::int;
  v_max int := nullif(p_data->>'max_uses', '')::int;
  v_start timestamptz := nullif(p_data->>'starts_at', '')::timestamptz;
  v_end timestamptz := nullif(p_data->>'expires_at', '')::timestamptz;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if v_code = '' then raise exception 'Informe o código do cupom.'; end if;
  if v_val is null or v_val < 1 or v_val > 100 then raise exception 'O desconto deve ficar entre 1 e 100%%.'; end if;
  if v_max is not null and v_max < 1 then raise exception 'O limite de usos deve ser 1 ou mais.'; end if;
  if v_start is not null and v_end is not null and v_end <= v_start then raise exception 'O fim da validade deve ser depois do início.'; end if;

  if p_id is null then
    insert into public.discount_coupons (code, discount_type, discount_value, max_uses, starts_at, expires_at, applicable_plan_ids, is_active)
    values (v_code, 'percentage', v_val, v_max, v_start, v_end, null, true)
    returning id into v_id;
  else
    update public.discount_coupons
       set code = v_code, discount_type = 'percentage', discount_value = v_val,
           max_uses = v_max, starts_at = v_start, expires_at = v_end
     where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Cupom não encontrado.'; end if;
  end if;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), case when p_id is null then 'coupon_created' else 'coupon_updated' end,
          jsonb_build_object('coupon_id', v_id, 'code', v_code));
  return v_id;
exception when unique_violation then
  raise exception 'Já existe um cupom com o código %.', v_code;
end;
$$;

create or replace function public.admin_coupon_set_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  update public.discount_coupons set is_active = p_active where id = p_id;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'coupon_toggled', jsonb_build_object('coupon_id', p_id, 'active', p_active));
end;
$$;

create or replace function public.admin_coupon_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  delete from public.discount_coupons where id = p_id returning code into v_code;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'coupon_deleted', jsonb_build_object('coupon_id', p_id, 'code', v_code));
exception when foreign_key_violation then
  raise exception 'Este cupom já foi usado em assinaturas. Use Pausar em vez de excluir.';
end;
$$;

revoke all on function public.admin_coupon_save(uuid, jsonb) from public, anon;
revoke all on function public.admin_coupon_set_active(uuid, boolean) from public, anon;
revoke all on function public.admin_coupon_delete(uuid) from public, anon;
grant execute on function public.admin_coupon_save(uuid, jsonb) to authenticated;
grant execute on function public.admin_coupon_set_active(uuid, boolean) to authenticated;
grant execute on function public.admin_coupon_delete(uuid) to authenticated;

select code, discount_value, times_used, max_uses, starts_at, expires_at, is_active from public.discount_coupons order by created_at desc;