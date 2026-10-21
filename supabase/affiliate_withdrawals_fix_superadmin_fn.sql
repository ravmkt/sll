Set-Location "F:\RODRIGO VICENTE\DYAD\sll-hub"
Get-Clipboard | Set-Content supabase\affiliate_withdrawals_fix_superadmin_fn.sql -Encoding utf8
npm run build
git add supabase\affiliate_withdrawals_fix_superadmin_fn.sql
git commit -m "fix(seguranca): trigger de update usa is_super_admin()"
git push

