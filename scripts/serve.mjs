// Tiny static web server for local testing.
//   npm run serve                   serves src/ (the editable game)
//   npm run serve -- dist/web       serves a finished web build
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';
import { paths } from './lib/paths.mjs';

const dir = process.argv[2] ? resolve(process.argv[2]) : paths.src;
const port = Number(process.env.PORT) || 5500;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4' };

createServer(async (req, res) => {
  try {
    let file = join(dir, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
}).listen(port, '127.0.0.1', () => console.log(`Serverer ${dir}\nhttp://127.0.0.1:${port}`));
