; Inno Setup script for the Windows installer.
; Normally you do not run this by hand: `npm run build windows` compiles it with ISCC and passes in
; the values below (/DMyAppVersion, /DSourceDir, /DOutputDir, /DIconFile). The defaults let you
; open and compile it directly from the Inno Setup IDE after a build.

#define MyAppName "Stjernehotellet"
#define MyAppPublisher "zhiftyDK"
#define MyAppExeName "Stjernehotellet.exe"

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\dist\app\Stjernehotellet-win32-x64"
#endif
#ifndef OutputDir
  #define OutputDir "..\dist\installer"
#endif
#ifndef IconFile
  #define IconFile "..\electron\icon.ico"
#endif

[Setup]
; Keep this AppId unchanged, otherwise updates will install next to the old version instead of replacing it.
AppId={{STJERNEHOTELLET-APP-ID-2026}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}

DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}

OutputDir={#OutputDir}
OutputBaseFilename=Stjernehotellet-Setup

SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\{#MyAppExeName}
WizardStyle=modern

Compression=lzma2
SolidCompression=yes

ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest

[Tasks]
Name: "desktopicon"; Description: "Opret genvej på skrivebordet"; GroupDescription: "Genveje:"
Name: "startmenuicon"; Description: "Opret genvej i Start-menuen"; GroupDescription: "Genveje:"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Start {#MyAppName}"; Flags: nowait postinstall skipifsilent
