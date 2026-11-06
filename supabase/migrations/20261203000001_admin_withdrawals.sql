-- Saques de afiliados no Master: listagem e processamento (so superadmin)
do $chk$
begin
  if to_regprocedure('public.is_superadmin()') is null then
    raise exception 'Funcao public.is_superadmin() nao existe';
  end if;
  if to_regprocedure('public.is_super_admin()') is null then
    raise exception 'Funcao public.is_super_admin() nao existe (usada pelo trigger protect_withdrawal_update)';
  end if;
end
$chk$;

create or replace function public.admin_list_withdrawals(
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_rows jsonb;
  v_total int;
  v_sum jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select count(*) into v_total
  from public.affiliate_withdrawals w
  where p_status is null or w.status = p_status;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.requested_at desc), '[]'::jsonb)
  into v_rows
  from (
    select w.id, w.store_id, s.name as store_name, u.email as owner_email,
           w.amount, w.pix_key, w.pix_key_type, w.status,
           w.proof_url, w.admin_notes, w.requested_at, w.processed_at
    from public.affiliate_withdrawals w
    left join public.stores s on s.id = w.store_id
    left join auth.users u on u.id = s.owner_user_id
    where p_status is null or w.status = p_status
    order by w.requested_at desc
    limit greatest(least(coalesce(p_limit, 50), 200), 1)
    offset greatest(coalesce(p_offset, 0), 0)
  ) x;

  select jsonb_build_object(
    'pending_count',   count(*) filter (where status = 'pending'),
    'pending_amount',  coalesce(sum(amount) filter (where status = 'pending'), 0),
    'approved_count',  count(*) filter (where status = 'approved'),
    'approved_amount', coalesce(sum(amount) filter (where status = 'approved'), 0),
    'paid_amount',     coalesce(sum(amount) filter (where status = 'paid'), 0)
  ) into v_sum
  from public.affiliate_withdrawals;

  return jsonb_build_object('total', v_total, 'rows', v_rows, 'summary', v_sum);
end
$fn$;

create or replace function public.admin_process_withdrawal(
  p_id uuid,
  p_action text,
  p_notes text default null,
  p_proof_url text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  w public.affiliate_withdrawals;
  v_new text;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_proof text := nullif(btrim(coalesce(p_proof_url, '')), '');
begin
  if not public.is_superadmin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into w from public.affiliate_withdrawals where id = p_id for update;
  if not found then
    raise exception 'Saque nao encontrado';
  end if;

  if p_action = 'approve' then
    if w.status <> 'pending' then raise exception 'Somente saques pendentes podem ser aprovados'; end if;
    v_new := 'approved';
  elsif p_action = 'pay' then
    if w.status <> 'approved' then raise exception 'Aprove o saque antes de marcar como pago'; end if;
    v_new := 'paid';
  elsif p_action = 'reject' then
    if w.status not in ('pending', 'approved') then raise exception 'Este saque nao pode mais ser rejeitado'; end if;
    if v_notes is null then raise exception 'Informe o motivo da rejeicao'; end if;
    v_new := 'rejected';
  else
    raise exception 'Acao invalida';
  end if;

  update public.affiliate_withdrawals
  set status = v_new,
      admin_notes = coalesce(v_notes, admin_notes),
      proof_url = case when v_new = 'paid' then coalesce(v_proof, proof_url) else proof_url end,
      processed_at = case when v_new in ('paid', 'rejected') then now() else processed_at end
  where id = p_id;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'withdrawal_' || p_action,
          jsonb_build_object('withdrawal_id', p_id, 'store_id', w.store_id, 'amount', w.amount,
                             'from_status', w.status, 'to_status', v_new, 'notes', v_notes));

  return jsonb_build_object('id', p_id, 'status', v_new);
end
$fn$;

revoke all on function public.admin_list_withdrawals(text, int, int) from public, anon;
revoke all on function public.admin_process_withdrawal(uuid, text, text, text) from public, anon;
grant execute on function public.admin_list_withdrawals(text, int, int) to authenticated;
grant execute on function public.admin_process_withdrawal(uuid, text, text, text) to authenticated;