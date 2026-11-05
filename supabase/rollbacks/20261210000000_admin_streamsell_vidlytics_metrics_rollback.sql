drop function if exists public.admin_streamsell_metrics(int);
drop function if exists public.admin_vidlytics_metrics(int);
notify pgrst, 'reload schema';