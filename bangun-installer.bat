@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Membangun pemasang DEKRi Lab (butuh Rust dan NSIS) ===
powershell -NoProfile -ExecutionPolicy Bypass -File installer\build.ps1
if errorlevel 1 (
  echo.
  echo GAGAL. Pastikan Rust terpasang ^(https://rustup.rs^) lalu jalankan ulang.
  pause
  exit /b 1
)
echo.
echo SELESAI. Hasilnya ada di folder dist.
pause
