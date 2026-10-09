// Shared by the Windows and Mac builds: a minimal Electron project that gets packaged.
//
//   <stageDir>/   main process + preload + icon + a generated package.json
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths, packageJson } from './paths.mjs';

export const APP_NAME = 'Stjernehotellet';

export function stageElectronApp(stageDir) {
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
  for (const file of ['main.cjs', 'preload.cjs', 'icon.png']) cpSync(join(paths.electron, file), join(stageDir, file));
  writeFileSync(join(stageDir, 'package.json'), JSON.stringify({
    name: 'stjernehotellet',
    productName: APP_NAME,
    version: packageJson.version,
    description: packageJson.description,
    author: packageJson.author,
    main: 'main.cjs',
  }, null, 2));
}

// Loads @electron/packager (its export shape differs between versions).
export async function loadPackager() {
  const mod = await import('@electron/packager');
  return mod.packager ?? mod.default?.packager ?? mod.default;
}
