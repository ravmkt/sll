drop policy if exists "Superadmins podem ler audit logs" on public.admin_audit_logs;
create policy "Superadmins podem ler audit logs"
  on public.admin_audit_logs for select
  using (public.is_superadmin());

notify pgrst, 'reload schema';
