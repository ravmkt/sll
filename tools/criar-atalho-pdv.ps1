<#
  Cria o atalho "SLL PDV" na area de trabalho do Windows.
  Uso:  .\criar-atalho-pdv.ps1 -Url "https://SEU-DOMINIO/dashboard/modules/pdv"

  O atalho abre o PDV como aplicativo (sem barra de enderecos) e imprime direto,
  sem a janela de impressao (--kiosk-printing).

  ANTES DE USAR, em cada computador:
  1) Windows > Impressoras e scanners > defina a termica (ex.: Elgin L42 Pro) como IMPRESSORA PADRAO.
  2) Rode este script, abra o atalho "SLL PDV" e faca login (uma unica vez).
  3) No PDV, escolha a largura do papel (58 mm, 80 mm ou A4) na faixa de status.
  4) Abra o PDV com internet ao menos uma vez para guardar o catalogo para uso offline (ate 3 dias).
#>
param(
  [string]$Url = "",
  [string]$Nome = "SLL PDV"
)

if (-not $Url) { $Url = Read-Host "Cole o endereco do PDV (ex.: https://seudominio.com/dashboard/modules/pdv)" }
if (-not $Url) { throw "Endereco nao informado." }

$candidatos = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidatos | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw "Chrome ou Edge nao encontrado neste computador." }

# Perfil proprio: garante que o --kiosk-printing seja aplicado mesmo com o navegador ja aberto
$perfil = Join-Path $env:LOCALAPPDATA "SLL-PDV-Perfil"
$args = "--app=`"$Url`" --kiosk-printing --user-data-dir=`"$perfil`""

$desktop = [Environment]::GetFolderPath("Desktop")
$lnk = Join-Path $desktop "$Nome.lnk"
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnk)
$s.TargetPath = $browser
$s.Arguments = $args
$s.WorkingDirectory = Split-Path $browser
$s.IconLocation = "$browser,0"
$s.Save()

Write-Host "Atalho criado: $lnk" -ForegroundColor Green
Write-Host "Navegador: $browser"
Write-Host "Lembre-se: defina a termica como impressora padrao do Windows."