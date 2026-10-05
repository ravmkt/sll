do $$
declare c text;
begin
  foreach c in array array['access_token','refresh_token'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'store_integrations'
        and column_name = c and is_nullable = 'NO'
    ) then
      execute format('alter table public.store_integrations alter column %I drop not null', c);
    end if;
  end loop;
end $$;
