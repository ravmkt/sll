alter table live_commerce.live_presets
  add column if not exists active boolean not null default true;

notify pgrst, 'reload schema';