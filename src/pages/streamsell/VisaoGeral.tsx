cd "F:\RODRIGO VICENTE\DYAD\sll-hub"
New-Item -ItemType Directory -Force "src\pages\streamsell" | Out-Null
Get-Clipboard -Raw | Set-Content -Encoding UTF8 "src\pages\streamsell\VisaoGeral.tsx"

