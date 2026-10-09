// Build entry point.   npm run build windows   |   npm run build mac   |   npm run build web
import { buildWeb } from './lib/web.mjs';
import { buildWindows } from './lib/windows.mjs';
import { buildMac } from './lib/mac.mjs';

const targets = { web: buildWeb, windows: buildWindows, mac: buildMac };
const target = process.argv[2];

if (!targets[target]) {
  console.log(
    'Brug:\n' +
    '  npm run build windows   Windows-program + installer (dist/app og dist/installer)\n' +
    '  npm run build mac       Mac-program (dist/mac). Valgfrit: arm64 eller x64, ellers begge\n' +
    '  npm run build web       hjemmeside (dist/web)',
  );
  process.exit(target ? 1 : 0);
}

try {
  await targets[target](process.argv[3]);
} catch (error) {
  console.error('\n✖ Build fejlede:', error.message || error);
  process.exit(1);
}
