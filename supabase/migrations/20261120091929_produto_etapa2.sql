$root = "F:\RODRIGO VICENTE\DYAD\sll-hub"
Set-Location $root
$file = Join-Path $root "supabase\migrations\$(Get-Date -Format 'yyyyMMddHHmmss')_produto_etapa2.sql"
Get-Clipboard | Out-File $file -Encoding utf8

npm run build

git add supabase/migrations
git commit -m "feat(produtos): etapa 2 - campos, listas de preco, fornecedores, kit e campos extras"
git push

