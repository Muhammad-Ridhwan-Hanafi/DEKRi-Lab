# Membangun dekri-lab.exe lalu pemasang NSIS-nya. Dipakai CI dan pengembang di Windows.
#   powershell -ExecutionPolicy Bypass -File installer\build.ps1
# Hasil: dist\DEKRi-Lab-Setup-<versi>.exe dan dist\DEKRi-Lab-windows-x64.zip (tanpa pemasangan)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$m = [regex]::Match((Get-Content Cargo.toml -Raw), '(?m)^version\s*=\s*"([^"]+)"')
if (-not $m.Success) { throw 'Versi tidak ditemukan di Cargo.toml' }
$version = $m.Groups[1].Value

cargo build --release --locked -p dekri-ui
if ($LASTEXITCODE -ne 0) { throw 'cargo build gagal' }

$makensis = (Get-Command makensis -ErrorAction SilentlyContinue).Source
if (-not $makensis) {
  foreach ($d in @("${env:ProgramFiles(x86)}\NSIS", "$env:ProgramFiles\NSIS")) {
    if (Test-Path "$d\makensis.exe") { $makensis = "$d\makensis.exe"; break }
  }
}
if (-not $makensis -and (Get-Command choco -ErrorAction SilentlyContinue)) {
  choco install nsis -y --no-progress
  foreach ($d in @("${env:ProgramFiles(x86)}\NSIS", "$env:ProgramFiles\NSIS")) {
    if (Test-Path "$d\makensis.exe") { $makensis = "$d\makensis.exe"; break }
  }
}
if (-not $makensis) { throw 'makensis tidak ditemukan. Pasang NSIS 3 dari https://nsis.sourceforge.io lalu ulangi.' }

New-Item -ItemType Directory -Force dist | Out-Null
$exe = (Resolve-Path 'target\release\dekri-lab.exe').Path
$out = Join-Path (Resolve-Path dist).Path "DEKRi-Lab-Setup-$version.exe"
& $makensis -V2 "-DVERSION=$version" "-DEXE=$exe" "-DOUTFILE=$out" installer\dekri-lab.nsi
if ($LASTEXITCODE -ne 0) { throw 'makensis gagal' }

# Versi tanpa pemasangan: satu berkas .exe beserta lisensi.
$stage = 'dist\zip-stage'
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item $exe "$stage\dekri-lab.exe"
Copy-Item LICENSE, THIRD_PARTY_NOTICES.md $stage
Compress-Archive -Path "$stage\*" -DestinationPath 'dist\DEKRi-Lab-windows-x64.zip' -Force
Remove-Item $stage -Recurse -Force
Write-Host "Selesai: $out"
