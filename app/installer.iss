#define MyAppName "Stjernehotellet"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "zhiftyDK"
#define MyAppExeName "Stjernehotellet.exe"

[Setup]
AppId={{STJERNEHOTELLET-APP-ID-2026}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}

DefaultDirName={autopf}\Stjernehotellet
DefaultGroupName={#MyAppName}

OutputDir=installer
OutputBaseFilename=Stjernehotellet-Setup

SetupIconFile=icon.ico

Compression=lzma
SolidCompression=yes

PrivilegesRequired=lowest

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "startmenuicon"; Description: "Create a Start Menu shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "out\Stjernehotellet-win32-x64\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\Stjernehotellet"; Filename: "{app}\Stjernehotellet.exe"; Tasks: desktopicon
Name: "{group}\Stjernehotellet"; Filename: "{app}\Stjernehotellet.exe"; Tasks: startmenuicon

[Run]
Filename: "{app}\Stjernehotellet.exe"; Description: "Launch Stjernehotellet"; Flags: nowait postinstall skipifsilent