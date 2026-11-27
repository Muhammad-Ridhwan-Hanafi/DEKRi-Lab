; Pemasang Windows DEKRi Lab (NSIS 3). Dibangun oleh .github/workflows/release.yml:
;   makensis -DVERSION=2.0.0 -DEXE=..\target\release\dekri-lab.exe -DOUTFILE=..\dist\DEKRi-Lab-Setup-2.0.0.exe installer\dekri-lab.nsi
; Pemasangan per pengguna (tanpa hak administrator). Folder tujuan bisa dipilih pada halaman "Choose Install Location".
; Pemasang TIDAK menyentuh data belajar (state*.json, users.json, folder Cadangan); lihat bagian Uninstall.

Unicode true
!ifndef VERSION
  !error "Beri -DVERSION=x.y.z"
!endif
!ifndef EXE
  !error "Beri -DEXE=jalur\dekri-lab.exe"
!endif
!ifndef OUTFILE
  !define OUTFILE "DEKRi-Lab-Setup-${VERSION}.exe"
!endif

!define APPNAME "DEKRi Lab"
!define PUBLISHER "Ridhwan"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\DEKRiLab"
!define APPKEY "Software\DEKRiLab"

Name "${APPNAME}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
InstallDirRegKey HKCU "${APPKEY}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${APPNAME} ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "FileDescription" "Pemasang ${APPNAME}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "MIT (kode sumber)"

!include "MUI2.nsh"
!define MUI_ICON "..\build\icon.ico"
!define MUI_UNICON "..\build\icon.ico"
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\dekri-lab.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Buka ${APPNAME} sekarang"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Indonesian"

Section "Install"
  SetOutPath "$INSTDIR"
  File "/oname=dekri-lab.exe" "${EXE}"
  File "..\build\icon.ico"
  SetOutPath "$INSTDIR\licenses"
  File "/oname=LICENSE.txt" "..\LICENSE"
  File "..\THIRD_PARTY_NOTICES.md"

  WriteUninstaller "$INSTDIR\uninstall.exe"

  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\dekri-lab.exe" "" "$INSTDIR\icon.ico"
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\dekri-lab.exe" "" "$INSTDIR\icon.ico"

  WriteRegStr HKCU "${APPKEY}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  ; Hanya berkas program yang dihapus. Progres belajar (folder "Latihan Siklus Akuntansi" di
  ; %APPDATA% dan Dokumen) sengaja dibiarkan agar aman bila Anda memasang ulang.
  Delete "$INSTDIR\dekri-lab.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\licenses\LICENSE.txt"
  Delete "$INSTDIR\licenses\THIRD_PARTY_NOTICES.md"
  RMDir "$INSTDIR\licenses"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
  RMDir "$SMPROGRAMS\${APPNAME}"
  Delete "$DESKTOP\${APPNAME}.lnk"

  DeleteRegKey HKCU "${UNINSTKEY}"
  DeleteRegKey HKCU "${APPKEY}"
SectionEnd
