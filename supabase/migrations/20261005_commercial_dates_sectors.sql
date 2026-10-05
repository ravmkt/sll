Set-Location "F:\RODRIGO VICENTE\DYAD\sll-hub"
Get-Clipboard | Set-Content "supabase\migrations\20261005_commercial_dates_sectors.sql" -Encoding UTF8

npm run build
if ($LASTEXITCODE -eq 0) {
  git add supabase/migrations
  git commit -m "feat(public): vincula datas comerciais aos setores"
  git push
  "OK: enviado ao Git"
} else {
  "ERRO no build: nada foi enviado."
}

