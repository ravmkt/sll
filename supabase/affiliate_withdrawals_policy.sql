begin;

drop policy if exists "Store can request own withdrawals" on public.affiliate_withdrawals;

create policy "Store can request own withdrawals" on public.affiliate_withdrawals
  for insert to authenticated
  with check (
    store_id in (select s.id from public.stores s where s.owner_user_id = auth.uid())
    and status = 'pending'
    and amount > 0
    and proof_url is null
    and admin_notes is null
    and processed_at is null
    and length(btrim(coalesce(pix_key, ''))) between 1 and 140
    and length(btrim(coalesce(pix_key_type, ''))) between 1 and 20
  );

alter table public.affiliate_withdrawals
  drop constraint if exists affiliate_withdrawals_amount_positive;
alter table public.affiliate_withdrawals
  add constraint affiliate_withdrawals_amount_positive check (amount > 0) not valid;

commit;
