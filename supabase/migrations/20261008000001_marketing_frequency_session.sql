do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.marketing_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%frequency%'
  loop
    execute format('alter table public.marketing_items drop constraint %I', c);
  end loop;
end $$;

alter table public.marketing_items
  add constraint marketing_items_frequency_check
  check (frequency in ('once', 'session', 'daily', 'always'));

select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.marketing_items'::regclass and contype = 'c';