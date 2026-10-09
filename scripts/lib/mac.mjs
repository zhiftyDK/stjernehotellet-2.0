// `npm run build mac [arm64|x64]`: macOS program (Electron), packed as .dmg (on a Mac) or .zip.
//
//   dist/app/Stjernehotellet-darwin-<arch>/Stjernehotellet.app   the finished program
//   dist/mac/Stjernehotellet-mac-<arch>.dmg                      disk image (only when built on a Mac)
//   dist/mac/Stjernehotellet-mac-<arch>.zip                      zip of the program (always)
//
// arm64 = Apple Silicon (M1 and newer), x64 = Intel Macs. No argument builds both.
// Tip: build on a Mac (or use the GitHub Actions workflow). A Mac is needed for .dmg and for signing.
import { cpSync, rmSync, mkdirSync, readdirSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { paths, packageJson, log } from './paths.mjs';
import { buildGameBundle } from './bundle.mjs';
import { makeIcns } from './icns.mjs';
import { APP_NAME, stageElectronApp, loadPackager } from './stage.mjs';

const ARCHS = ['arm64', 'x64'];

export async function buildMac(archArgument) {
  if (archArgument && !ARCHS.includes(archArgument)) {
    throw new Error(`Ukendt arkitektur "${archArgument}". Brug arm64 (Apple Silicon), x64 (Intel) eller ingenting for begge.`);
  }
  const archs = archArgument ? [archArgument] : ARCHS;
  const onMac = process.platform === 'darwin';
  const bundleDir = join(paths.dist, '_bundle');
  const stageDir = join(paths.dist, '_stage');
  const appOutDir = join(paths.dist, 'app');
  const macDir = join(paths.dist, 'mac');

  log('1/4  Bygger spillet (minificeret JavaScript)…');
  await buildGameBundle(bundleDir);

  log('2/4  Gør Electron-projektet klar…');
  stageElectronApp(stageDir);
  // macOS needs .icns. Put a bigger electron/icon-mac.png (e.g. 1024x1024 RGBA) next to icon.png for a sharper icon.
  const iconSource = [join(paths.electron, 'icon-mac.png'), join(paths.electron, 'icon.png')].find(existsSync);
  const icnsFile = join(stageDir, 'icon.icns');
  makeIcns(iconSource, icnsFile);

  log(`3/4  Pakker Mac-programmet (${archs.join(' + ')})…`);
  for (const arch of archs) rmSync(join(appOutDir, `${APP_NAME}-darwin-${arch}`), { recursive: true, force: true });
  const packager = await loadPackager();
  const outputPaths = await packager({
    dir: stageDir,
    out: appOutDir,
    name: APP_NAME,
    platform: 'darwin',
    arch: archs,
    asar: true,
    overwrite: true,
    icon: icnsFile,
    appBundleId: 'dk.zhiftydk.stjernehotellet',
    appCategoryType: 'public.app-category.games',
    appVersion: packageJson.version,
    extraResource: readdirSync(bundleDir).map((item) => join(bundleDir, item)),
  });

  log('4/4  Pakker til download…');
  rmSync(macDir, { recursive: true, force: true });
  mkdirSync(macDir, { recursive: true });
  const results = [];
  for (const [index, outputPath] of outputPaths.entries()) {
    const arch = archs[index];
    const appPath = join(outputPath, `${APP_NAME}.app`);
    if (!existsSync(appPath)) throw new Error(`Fandt ikke ${APP_NAME}.app i ${outputPath}.`);

    // Without a developer certificate the best we can do is an "ad-hoc" signature.
    // Apple Silicon Macs refuse to run completely unsigned programs, so this matters.
    if (onMac) run('codesign', ['--force', '--deep', '--sign', '-', appPath]);

    const zipFile = join(macDir, `${APP_NAME}-mac-${arch}.zip`);
    if (zipApp(appPath, zipFile, onMac)) results.push(zipFile);

    if (onMac) {
      const dmgFile = join(macDir, `${APP_NAME}-mac-${arch}.dmg`);
      makeDmg(appPath, dmgFile);
      results.push(dmgFile);
    }
  }

  rmSync(bundleDir, { recursive: true, force: true });
  rmSync(stageDir, { recursive: true, force: true });

  log('Færdig:');
  for (const file of results) console.log(`  ${file}`);
  if (!onMac) {
    console.log(
      '\n  Bemærk: Der blev ikke lavet en .dmg, fordi det kræver en Mac. Zip-filen kan bruges til udgivelse,\n' +
      '  og programmet er ikke signeret. Byg på en Mac (eller med GitHub Actions) for et signeret program og en .dmg.',
    );
  }
  console.log(
    '\n  Første gang en bruger åbner programmet, skal macOS have lov (programmet er ikke Apple-godkendt):\n' +
    '  højreklik på programmet → Åbn → Åbn.  Eller:  xattr -cr /Applications/Stjernehotellet.app',
  );
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} fejlede (kode ${result.status ?? result.error?.message}).`);
}

// A .zip that keeps the program's symbolic links intact (needed for macOS programs).
function zipApp(appPath, zipFile, onMac) {
  const parent = join(appPath, '..');
  const attempt = onMac
    ? spawnSync('ditto', ['-c', '-k', '--keepParent', appPath, zipFile], { stdio: 'inherit' })
    : spawnSync('zip', ['-qry', zipFile, `${APP_NAME}.app`], { stdio: 'inherit', cwd: parent });
  if (attempt.status === 0) return true;
  console.warn(`  ⚠ Kunne ikke lave zip-filen (${onMac ? 'ditto' : 'zip'} mangler?). Programmet ligger i ${appPath}.`);
  return false;
}

// A disk image with the program and a shortcut to /Applications (drag-and-drop install).
function makeDmg(appPath, dmgFile) {
  const folder = join(paths.dist, '_dmg');
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  cpSync(appPath, join(folder, `${APP_NAME}.app`), { recursive: true, verbatimSymlinks: true });
  symlinkSync('/Applications', join(folder, 'Applications'));
  run('hdiutil', ['create', '-volname', APP_NAME, '-srcfolder', folder, '-ov', '-format', 'UDZO', dmgFile]);
  rmSync(folder, { recursive: true, force: true });
}
