alter table public.subscriptions add column if not exists confirmation_email_sent_at timestamptz;

-- Assinaturas ja ativas nao devem disparar e-mail na proxima renovacao
update public.subscriptions
   set confirmation_email_sent_at = now()
 where confirmation_email_sent_at is null
   and status in ('active', 'past_due', 'lifetime', 'canceled');

select count(*) filter (where confirmation_email_sent_at is null) as pendentes,
       count(*) as total
from public.subscriptions;