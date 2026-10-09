// Builds a ready-to-host copy of the game: minified JavaScript + everything else the page needs.
//
// outDir/ will contain index.html, custom.css, css/, img/, profil/, data/ and js/ (main.js plus one small
// lazily loaded chunk per minigame). The editable source in src/ is never touched.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { paths } from './paths.mjs';

const COPIED_ITEMS = ['index.html', 'custom.css', 'css', 'img', 'profil', 'data'];

export async function buildGameBundle(outDir) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const entry = join(paths.src, 'js', 'main.js');
  const jsOut = join(outDir, 'js');

  if (typeof Bun !== 'undefined') {
    // Bun can run the build too (same result as esbuild).
    const result = await Bun.build({ entrypoints: [entry], outdir: jsOut, minify: true, splitting: true, target: 'browser', format: 'esm' });
    if (!result.success) throw new Error(result.logs.join('\n'));
  } else {
    const { build } = await import('esbuild');
    await build({ entryPoints: [entry], outdir: jsOut, bundle: true, splitting: true, format: 'esm', minify: true, target: 'es2020', legalComments: 'none' });
  }

  for (const item of COPIED_ITEMS) {
    const from = join(paths.src, item);
    if (existsSync(from)) cpSync(from, join(outDir, item), { recursive: true });
  }
}
