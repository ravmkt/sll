alter table live_commerce.lives
  add column if not exists stock_limit integer not null default 3;
notify pgrst, 'reload schema';
