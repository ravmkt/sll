alter table public.tip_feedback add column if not exists updated_at timestamptz not null default now();

create or replace function public.tip_feedback_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_tip_feedback_touch on public.tip_feedback;
create trigger trg_tip_feedback_touch
before insert or update on public.tip_feedback
for each row execute function public.tip_feedback_touch();

create index if not exists tip_feedback_tip_idx on public.tip_feedback (tip_id);

create or replace view public.admin_tip_engagement as
select t.id as tip_id, t.title, t.category,
  count(f.tip_id) as interactions,
  count(*) filter (where f.vote = 1) as likes,
  count(*) filter (where f.vote = -1) as dislikes,
  count(*) filter (where f.implemented) as implemented,
  round(100.0 * count(*) filter (where f.implemented) / nullif(count(f.tip_id), 0), 1) as implementation_rate
from public.tips t
left join public.tip_feedback f on f.tip_id = t.id
group by t.id, t.title, t.category;

create or replace view public.admin_tip_engagement_by_category as
select category,
  sum(interactions) as interactions,
  sum(likes) as likes,
  sum(dislikes) as dislikes,
  sum(implemented) as implemented,
  round(100.0 * sum(implemented) / nullif(sum(interactions), 0), 1) as implementation_rate
from public.admin_tip_engagement
group by category;

revoke all on public.admin_tip_engagement, public.admin_tip_engagement_by_category from anon, authenticated;
grant select on public.admin_tip_engagement, public.admin_tip_engagement_by_category to service_role;