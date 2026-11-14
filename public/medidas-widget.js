cd "F:\RODRIGO VICENTE\DYAD\sll-hub"
New-Item -ItemType Directory -Force -Path "public" | Out-Null
Get-Clipboard -Raw | Set-Content -Encoding UTF8 "public\medidas-widget.js"
(Get-Content "public\medidas-widget.js" | Measure-Object -Line).Lines
Select-String -Path "public\medidas-widget.js" -Pattern "openTexts" | Select-Object -First 1

