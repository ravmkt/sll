create table if not exists vidlytics.vid_selector_sessions (
  id uuid primary key default gen_random_uuid()
);

alter table vidlytics.vid_selector_sessions add column if not exists token text;
alter table vidlytics.vid_selector_sessions add column if not exists story_id uuid;
alter table vidlytics.vid_selector_sessions add column if not exists store_id uuid;
alter table vidlytics.vid_selector_sessions add column if not exists selector text;
alter table vidlytics.vid_selector_sessions add column if not exists position text;
alter table vidlytics.vid_selector_sessions add column if not exists created_at timestamptz not null default now();
alter table vidlytics.vid_selector_sessions add column if not exists updated_at timestamptz not null default now();

drop index if exists vidlytics.idx_vid_selector_sessions_token_unique;
create unique index idx_vid_selector_sessions_token_unique
  on vidlytics.vid_selector_sessions(token);

alter table vidlytics.vid_selector_sessions enable row level security;

drop policy if exists "Anon pode inserir/atualizar sessao de seletor" on vidlytics.vid_selector_sessions;
create policy "Anon pode inserir/atualizar sessao de seletor"
  on vidlytics.vid_selector_sessions
  for all
  using (true)
  with check (true);
