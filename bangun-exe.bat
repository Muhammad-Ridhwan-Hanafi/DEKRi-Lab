@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Membangun installer DEKRi Lab ===

call npm install || goto :gagal
call npm run typecheck || goto :gagal
call npm test || goto :gagal
set TRY=0
:build
set /a TRY+=1
rem Pakai Electron yang sudah terunduh oleh npm (node_modules\electron\dist) agar electron-builder tidak mengunduh ulang dari GitHub.
if exist "node_modules\electron\dist\electron.exe" (
  call npm run build:single && call npx electron-builder --win nsis --publish never -c.electronDist=node_modules/electron/dist
) else (
  call npm run dist:win
)
if errorlevel 1 (
  if %TRY% lss 3 (
    echo.
    echo Percobaan %TRY% gagal ^(biasanya karena unduhan terputus^). Mengulang dalam 5 detik...
    timeout /t 5 /nobreak >nul
    goto :build
  )
  goto :gagal
)

rem Folder win-unpacked hanyalah bahan baku pembuatan installer, bukan untuk dibagikan.
if exist "release\win-unpacked" rmdir /s /q "release\win-unpacked"

echo.
echo SELESAI. Bagikan berkas ini: release\DEKRi-Lab-Setup-*.exe
echo Jalankan berkas tersebut untuk memasang DEKRi Lab (pilih folder, pintasan Desktop dan Start Menu).
pause
exit /b 0

:gagal
echo.
echo GAGAL pada tahap di atas. Perbaiki galat lalu jalankan ulang.
pause
exit /b 1
