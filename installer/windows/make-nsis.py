#!/usr/bin/env python3
"""Writes and compiles the Windows installer for Chord Lab Studio with NSIS.

The uninstaller is written by the installer on Windows (WriteUninstaller), so
building needs no Wine. It removes only the files it installed, then the folder
if empty. Projects in %APPDATA%\\Chord Lab Studio stay.

Usage: python3 installer/windows/make-nsis.py <win-unpacked> <icon.ico> <version> <out.exe> <makensis> <nsisdir>
"""
import os, sys, subprocess

src, icon, version, out, makensis, nsisdir = sys.argv[1:7]
src = os.path.abspath(src)
files, dirs = [], []
for d, subdirs, names in os.walk(src):
    rel = os.path.relpath(d, src)
    if rel != '.':
        dirs.append(rel)
    for n in names:
        files.append(os.path.normpath(os.path.join(rel, n)))
win = lambda p: p.replace('/', '\\')
size_kb = sum(os.path.getsize(os.path.join(src, f)) for f in files) // 1024
uninstall = '\n'.join(f'  Delete "$INSTDIR\\{win(f)}"' for f in sorted(files))
uninstall += '\n' + '\n'.join(f'  RMDir "$INSTDIR\\{win(d)}"' for d in sorted(dirs, key=lambda x: -x.count(os.sep)))
a, b, c = version.split('.')

nsi = f'''Unicode true
ManifestDPIAware true
!include "MUI2.nsh"
!include "x64.nsh"
!define APPNAME "Chord Lab Studio"
!define APPEXE "Chord Lab Studio.exe"
!define UNINSTEXE "Κατάργηση Chord Lab Studio.exe"
!define UNINSTKEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ChordLabStudio"
Name "${{APPNAME}} {version}"
OutFile "{os.path.abspath(out)}"
InstallDir "$LOCALAPPDATA\\Programs\\${{APPNAME}}"
InstallDirRegKey HKCU "${{UNINSTKEY}}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Chord Lab Studio {version}"

!define MUI_ICON "{os.path.abspath(icon)}"
!define MUI_UNICON "{os.path.abspath(icon)}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\\${{APPEXE}}"
!define MUI_FINISHPAGE_RUN_TEXT "Άνοιγμα του Chord Lab Studio"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Greek"

VIProductVersion "{a}.{b}.{c}.0"
VIAddVersionKey /LANG=${{LANG_GREEK}} "ProductName" "Chord Lab Studio"
VIAddVersionKey /LANG=${{LANG_GREEK}} "FileDescription" "Εγκατάσταση Chord Lab Studio"
VIAddVersionKey /LANG=${{LANG_GREEK}} "FileVersion" "{version}"
VIAddVersionKey /LANG=${{LANG_GREEK}} "ProductVersion" "{version}"
VIAddVersionKey /LANG=${{LANG_GREEK}} "LegalCopyright" ""

Function .onInit
  ${{IfNot}} ${{RunningX64}}
    MessageBox MB_ICONSTOP "Το Chord Lab Studio χρειάζεται Windows 64-bit."
    Abort
  ${{EndIf}}
FunctionEnd

; Ask a running copy to close (it saves on close), then make sure it is gone.
!macro CloseApp
  nsExec::Exec 'taskkill /IM "${{APPEXE}}"'
  Sleep 1500
  nsExec::Exec 'taskkill /IM "${{APPEXE}}" /F'
!macroend

Section "Chord Lab Studio"
  !insertmacro CloseApp
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\\resources"
  File /r "{src}\\*.*"
  WriteUninstaller "$INSTDIR\\${{UNINSTEXE}}"
  CreateShortCut "$SMPROGRAMS\\${{APPNAME}}.lnk" "$INSTDIR\\${{APPEXE}}" "" "$INSTDIR\\${{APPEXE}}" 0
  CreateShortCut "$DESKTOP\\${{APPNAME}}.lnk" "$INSTDIR\\${{APPEXE}}" "" "$INSTDIR\\${{APPEXE}}" 0
  WriteRegStr HKCU "${{UNINSTKEY}}" "DisplayName" "Chord Lab Studio"
  WriteRegStr HKCU "${{UNINSTKEY}}" "DisplayVersion" "{version}"
  WriteRegStr HKCU "${{UNINSTKEY}}" "Publisher" "Chord Lab"
  WriteRegStr HKCU "${{UNINSTKEY}}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${{UNINSTKEY}}" "DisplayIcon" "$INSTDIR\\${{APPEXE}},0"
  WriteRegStr HKCU "${{UNINSTKEY}}" "UninstallString" '"$INSTDIR\\${{UNINSTEXE}}"'
  WriteRegStr HKCU "${{UNINSTKEY}}" "QuietUninstallString" '"$INSTDIR\\${{UNINSTEXE}}" /S'
  WriteRegDWORD HKCU "${{UNINSTKEY}}" "NoModify" 1
  WriteRegDWORD HKCU "${{UNINSTKEY}}" "NoRepair" 1
  WriteRegDWORD HKCU "${{UNINSTKEY}}" "EstimatedSize" {size_kb}
SectionEnd

Section "Uninstall"
  !insertmacro CloseApp
  Delete "$SMPROGRAMS\\${{APPNAME}}.lnk"
  Delete "$DESKTOP\\${{APPNAME}}.lnk"
{uninstall}
  Delete "$INSTDIR\\${{UNINSTEXE}}"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${{UNINSTKEY}}"
SectionEnd
'''
nsi_path = os.path.splitext(out)[0] + '.nsi'
with open(nsi_path, 'w', encoding='utf-8-sig') as f:
    f.write(nsi)
env = dict(os.environ, NSISDIR=nsisdir)
r = subprocess.run([makensis, '-V2', nsi_path], env=env, capture_output=True, text=True)
sys.stdout.write(r.stdout[-3000:]); sys.stderr.write(r.stderr[-3000:])
sys.exit(r.returncode)
