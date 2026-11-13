insert into public.noah_models (model, label, input_usd, output_usd)
values ('gemini-2.5-flash-image', 'Gemini 2.5 Flash Image', 0.30, 30.00)
on conflict (model) do update
  set label = excluded.label, input_usd = excluded.input_usd, output_usd = excluded.output_usd;

notify pgrst, 'reload schema';

select model, input_usd, output_usd from public.noah_models order by 1;