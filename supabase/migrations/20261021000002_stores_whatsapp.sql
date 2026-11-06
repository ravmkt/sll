alter table public.stores add column if not exists whatsapp text;
comment on column public.stores.whatsapp is 'WhatsApp de contato do dono da loja (somente digitos, com DDI). Usado pelo Master.';