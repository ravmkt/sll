-- Alertas dos benchmarks automaticos (calculados na hora, somem sozinhos ao atualizar).
-- Ciclos: 02/01 e 01/07, 09:00 UTC (06:00 Brasilia). Vale a partir do ciclo de 02/01/2027.
create or replace function public.admin_benchmark_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_y int := extract(year from (v_now at time zone 'UTC'))::int;
  v_due timestamptz;
  v_total int;
  v_stale int;
  v_out jsonb := '[]'::jsonb;
  v_cron text;
  v_http text;
  v_detail text;
  v_date text;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  v_due := case
    when v_now >= make_timestamptz(v_y, 7, 1, 9, 0, 0, 'UTC') then make_timestamptz(v_y, 7, 1, 9, 0, 0, 'UTC')
    when v_now >= make_timestamptz(v_y, 1, 2, 9, 0, 0, 'UTC') then make_timestamptz(v_y, 1, 2, 9, 0, 0, 'UTC')
    else make_timestamptz(v_y - 1, 7, 1, 9, 0, 0, 'UTC')
  end;

  -- Ainda sem ciclo automatico valido, ou ainda dentro da janela de execucao (90 min)
  if v_due < timestamptz '2027-01-02 09:00:00+00' then return v_out; end if;
  if v_now < v_due + interval '90 minutes' then return v_out; end if;

  select count(*), count(*) filter (where updated_at < v_due)
    into v_total, v_stale
  from public.sector_benchmarks;

  if coalesce(v_total, 0) = 0 or v_stale = 0 then return v_out; end if;

  v_date := to_char(v_due at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');

  -- Causa provavel (melhor esforco)
  begin
    select left(coalesce(d.return_message, d.status), 160) into v_cron
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where j.jobname like 'benchmarks-%' and d.start_time >= v_due and d.status = 'failed'
    order by d.start_time desc limit 1;
  exception when others then v_cron := null; end;

  begin
    select 'resposta HTTP ' || coalesce(r.status_code::text, 'sem codigo') ||
           coalesce(' - ' || nullif(left(r.error_msg, 120), ''), '')
      into v_http
    from net._http_response r
    where r.created >= v_due
      and (r.status_code is null or r.status_code >= 300 or r.timed_out is true or r.error_msg is not null)
    order by r.created desc limit 1;
  exception when others then v_http := null; end;

  v_detail := nullif(concat_ws(' | ', v_cron, v_http), '');

  if v_stale = v_total then
    v_out := jsonb_build_array(jsonb_build_object(
      'key', 'benchmarks_not_run',
      'level', 'critical',
      'title', 'Benchmarks não foram atualizados em ' || v_date,
      'detail', 'Nenhum dos ' || v_total || ' setores foi atualizado.' ||
                coalesce(' Causa provável: ' || v_detail || '.', '') ||
                ' Abra IA & Suporte Noah > Benchmarks, confira a IA e rode a atualização manual.'
    ));
  elsif v_stale * 4 >= v_total then
    v_out := jsonb_build_array(jsonb_build_object(
      'key', 'benchmarks_partial',
      'level', 'warning',
      'title', 'Benchmarks incompletos no ciclo de ' || v_date,
      'detail', v_stale || ' de ' || v_total || ' setores continuam sem atualização.' ||
                coalesce(' Possível causa: ' || v_detail || '.', '') ||
                ' Rode a atualização manual em IA & Suporte Noah > Benchmarks.'
    ));
  end if;

  return v_out;
end;
$$;

revoke all on function public.admin_benchmark_alerts() from public, anon;
grant execute on function public.admin_benchmark_alerts() to authenticated;
notify pgrst, 'reload schema';

select proname from pg_proc where proname = 'admin_benchmark_alerts';