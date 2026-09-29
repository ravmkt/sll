alter table public.stores
  add column if not exists security_token text;

update public.stores
set security_token = encode(gen_random_bytes(24), 'hex')
where security_token is null;

alter table public.stores
  alter column security_token set default encode(gen_random_bytes(24), 'hex');
