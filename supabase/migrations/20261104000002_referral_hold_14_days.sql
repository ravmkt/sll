-- Carência das comissões de indicação: 15 -> 14 dias
do $mig$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select p.oid, pg_get_functiondef(p.oid) as def
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and p.prosrc like '%interval ''15 days''%'
      and p.prosrc like '%available_at%'
  loop
    execute replace(r.def, 'interval ''15 days''', 'interval ''14 days''');
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Nenhuma função com carência de 15 dias encontrada';
  end if;
  raise notice 'Funções ajustadas: %', v_count;
end
$mig$;

-- Comissões já pendentes também passam a liberar 1 dia antes
update public.referral_rewards
set available_at = available_at - interval '1 day'
where status = 'pending' and available_at is not null;