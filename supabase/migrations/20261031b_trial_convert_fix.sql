Set-Location "F:\RODRIGO VICENTE\DYAD\sll-hub"
$utf8 = New-Object Text.UTF8Encoding($false)
$p = Join-Path $PWD "supabase\migrations\20261031b_trial_convert_fix.sql"
if (Test-Path $p) { Write-Host "Ja existe"; return }
$sql = Get-Clipboard -Raw
if ($sql -notmatch 'subscriptions_trial_convert') { Write-Host "Copie o SQL acima antes de rodar"; return }
[IO.File]::WriteAllText($p, $sql, $utf8)
npm run build
if ($LASTEXITCODE -eq 0) { git add $p; git commit -m "fix(trial): periodo pago inicia no vencimento do trial"; git push }
