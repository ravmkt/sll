alter table public.admin_store_benefits add column if not exists months int
  check (months is null or months between 1 and 36);
alter table public.admin_store_benefits add column if not exists consumed boolean not null default false;

alter table public.subscriptions add column if not exists benefit_id uuid references public.admin_store_benefits(id);
alter table public.subscriptions add column if not exists benefit_discount_percent numeric;
alter table public.subscriptions add column if not exists benefit_months_left int;
alter table public.subscriptions add column if not exists benefit_full_value_cents int;

drop function if exists public.admin_master_add_benefit(uuid, text, text, text);

create or replace function public.admin_master_add_benefit(
  p_store_id uuid, p_kind text, p_value text, p_note text, p_months int default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_kind not in ('trial_days', 'discount_percent', 'coupon') then raise exception 'invalid kind'; end if;
  if p_months is not null and (p_months < 1 or p_months > 36) then raise exception 'meses entre 1 e 36'; end if;

  if p_kind = 'trial_days' then
    v_days := p_value::int;
    if v_days < 1 or v_days > 365 then raise exception 'dias entre 1 e 365'; end if;
    update public.stores
       set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => v_days)
     where id = p_store_id;
  elsif p_kind = 'discount_percent' then
    if p_value::numeric <= 0 or p_value::numeric > 100 then raise exception 'desconto entre 1 e 100'; end if;
  end if;

  insert into public.admin_store_benefits (store_id, kind, value, note, created_by, months)
  values (p_store_id, p_kind, trim(p_value), nullif(trim(coalesce(p_note, '')), ''), auth.uid(),
          case when p_kind = 'discount_percent' then p_months else null end);

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'benefit_applied',
          jsonb_build_object('store_id', p_store_id, 'kind', p_kind, 'value', p_value, 'months', p_months, 'note', p_note));
end;
$$;

revoke all on function public.admin_master_add_benefit(uuid, text, text, text, int) from public, anon;
grant execute on function public.admin_master_add_benefit(uuid, text, text, text, int) to authenticated;

select kind, value, months, consumed from public.admin_store_benefits order by created_at desc limit 5;