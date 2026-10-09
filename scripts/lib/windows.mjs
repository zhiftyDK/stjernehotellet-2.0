// `npm run build windows`: Windows program (Electron) + installer (Inno Setup).
//
//   dist/_bundle/                       minified game (temporary)
//   dist/_stage/                        what Electron packages: main process + preload + icon
//   dist/app/Stjernehotellet-win32-x64/ the finished program (runs without installing)
//   dist/installer/Stjernehotellet-Setup.exe   the installer (needs Inno Setup)
import { rmSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { paths, packageJson, log } from './paths.mjs';
import { buildGameBundle } from './bundle.mjs';
import { APP_NAME, stageElectronApp, loadPackager } from './stage.mjs';

export async function buildWindows() {
  const bundleDir = join(paths.dist, '_bundle');
  const stageDir = join(paths.dist, '_stage');
  const appOutDir = join(paths.dist, 'app');
  const installerDir = join(paths.dist, 'installer');

  // 1. Minified game.
  log('1/4  Bygger spillet (minificeret JavaScript)…');
  await buildGameBundle(bundleDir);

  // 2. Minimal Electron project: only the files the main process needs.
  log('2/4  Gør Electron-projektet klar…');
  stageElectronApp(stageDir);

  // 3. Package the Windows program. The game files go next to the exe (resources/), where main.cjs serves them from.
  log('3/4  Pakker Windows-programmet (Electron)…');
  rmSync(appOutDir, { recursive: true, force: true });
  const packager = await loadPackager();
  const [outputPath] = await packager({
    dir: stageDir,
    out: appOutDir,
    name: APP_NAME,
    executableName: APP_NAME,
    platform: 'win32',
    arch: 'x64',
    asar: true,
    overwrite: true,
    icon: join(paths.electron, 'icon.ico'),
    extraResource: readdirSync(bundleDir).map((item) => join(bundleDir, item)),
  });
  console.log(`  Program: ${outputPath}`);

  // 4. Installer.
  log('4/4  Laver installationsprogrammet (Inno Setup)…');
  mkdirSync(installerDir, { recursive: true });
  const compiler = findInnoSetupCompiler();
  if (!compiler) {
    console.warn(
      '\n⚠ Inno Setup blev ikke fundet, så installationsprogrammet blev ikke lavet.\n' +
      '  Programmet i dist/app kan allerede bruges. Installér Inno Setup 6 (winget install JRSoftware.InnoSetup),\n' +
      '  eller sæt miljøvariablen ISCC til stien på ISCC.exe, og kør kommandoen igen.',
    );
    process.exitCode = 1;
    return;
  }
  const result = spawnSync(compiler, [
    `/DMyAppVersion=${packageJson.version}`,
    `/DSourceDir=${outputPath}`,
    `/DOutputDir=${installerDir}`,
    `/DIconFile=${join(paths.electron, 'icon.ico')}`,
    paths.installerScript,
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Inno Setup fejlede (kode ${result.status}).`);
  // Temporary folders are no longer needed.
  rmSync(bundleDir, { recursive: true, force: true });
  rmSync(stageDir, { recursive: true, force: true });
  log(`Færdig: ${join(installerDir, 'Stjernehotellet-Setup.exe')}`);
}

// Looks for ISCC.exe: $ISCC, the usual install folders, then the PATH.
function findInnoSetupCompiler() {
  const candidates = [
    process.env.ISCC,
    process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Inno Setup 6', 'ISCC.exe'),
    process.env.ProgramFiles && join(process.env.ProgramFiles, 'Inno Setup 6', 'ISCC.exe'),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Inno Setup 6', 'ISCC.exe'),
  ].filter(Boolean);
  for (const candidate of candidates) if (existsSync(candidate)) return candidate;
  const onPath = spawnSync('ISCC', ['/?'], { stdio: 'ignore', shell: true });
  return onPath.status === 0 ? 'ISCC' : null;
}
