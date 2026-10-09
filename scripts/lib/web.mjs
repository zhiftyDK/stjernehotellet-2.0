// `npm run build web`: static website in dist/web (host it on any web server).
import { join } from 'node:path';
import { paths, log } from './paths.mjs';
import { buildGameBundle } from './bundle.mjs';

export async function buildWeb() {
  const outDir = join(paths.dist, 'web');
  log('Bygger hjemmesiden (minificeret JavaScript)…');
  await buildGameBundle(outDir);
  log(`Færdig: ${outDir}\n  Læg indholdet på en hvilken som helst webserver (eller test lokalt: npm run serve -- dist/web).`);
}
