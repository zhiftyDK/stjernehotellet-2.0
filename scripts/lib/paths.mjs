// Shared paths and small helpers for the build scripts.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const paths = {
  root,
  src: join(root, 'src'),              // the game (everything the browser loads)
  electron: join(root, 'electron'),    // Electron wrapper (main process, preload, icons)
  installerScript: join(root, 'installer', 'installer.iss'),
  dist: join(root, 'dist'),            // all build output (git-ignored)
};

export const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
export const log = (message) => console.log(`\n▶ ${message}`);
