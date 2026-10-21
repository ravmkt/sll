Get-Clipboard | Set-Content supabase\anon_policies_hardening_phase_b1.sql -Encoding utf8
npm run build
git add supabase\anon_policies_hardening_phase_b1.sql
git commit -m "fix(seguranca): remove policies duplicadas e restringe leitura publica de stories/videos (fase B1)"
git push

