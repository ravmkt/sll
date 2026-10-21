Set-Location "F:\RODRIGO VICENTE\DYAD\sll-hub"
Get-Clipboard | Set-Content supabase\public_store_rpcs.sql -Encoding utf8
(Get-Content supabase\public_store_rpcs.sql | Measure-Object -Line).Lines
git add supabase\public_store_rpcs.sql
git commit -m "feat(seguranca): RPCs get_store_public e get_store_settings_public"
git push

