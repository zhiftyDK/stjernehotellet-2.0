const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;
let win = null;

// Preferred port. If something else already uses it, we silently pick any free port instead.
// Saves do NOT depend on the port (they live in a file in the user-data folder, see below).
const PREFERRED_PORT = 5500;
let activePort = PREFERRED_PORT;

// ---------------------------------------------------------------------------------------------
// Save storage: one JSON file in the user-data folder, independent of origin/port.
// ---------------------------------------------------------------------------------------------
let store = null;            // { key: value } or null when no file exists yet
let writeTimer = null;
const saveFile = () => path.join(app.getPath('userData'), 'saves.json');

function readStoreFile() {
    for (const file of [saveFile(), saveFile() + '.bak']) {
        try {
            const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (parsed && typeof parsed.data === 'object' && parsed.data) return parsed.data;
        } catch { /* missing or corrupt -> try the backup */ }
    }
    return null;
}

function writeStoreNow() {
    clearTimeout(writeTimer);
    writeTimer = null;
    if (!store) return;
    const file = saveFile();
    const tmp = file + '.tmp';
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(tmp, JSON.stringify({ version: 1, data: store }));
        if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
        fs.renameSync(tmp, file);
    } catch (error) {
        console.error('Could not write save file:', error);
    }
}

function scheduleWrite() {
    if (!writeTimer) writeTimer = setTimeout(writeStoreNow, 400);
}

ipcMain.on('storage-load-sync', (event) => {
    if (store === null) store = readStoreFile();
    event.returnValue = { exists: store !== null, data: store || {} };
});
ipcMain.on('storage-set', (_e, key, value) => {
    if (store === null) store = {};
    store[String(key)] = String(value);
    scheduleWrite();
});
ipcMain.on('storage-remove', (_e, key) => {
    if (store === null) store = {};
    delete store[String(key)];
    scheduleWrite();
});
ipcMain.on('storage-replace', (_e, all) => {
    store = {};
    for (const [k, v] of Object.entries(all || {})) store[String(k)] = String(v);
    scheduleWrite();
});

// ---------------------------------------------------------------------------------------------
// Local web server for the game files
// ---------------------------------------------------------------------------------------------
const mimeTypes = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4'
};

function createGameServer(root) {
    return http.createServer((req, res) => {
        let urlPath;

        try {
            urlPath = decodeURIComponent(req.url.split('?')[0]);
        } catch {
            res.writeHead(400);
            res.end('Bad request');
            return;
        }

        // Prevent requests from escaping the application folder
        const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');

        let filePath = path.join(root, safePath);

        // URL "/" should load index.html
        if (urlPath === '/' || urlPath === '') {
            filePath = path.join(root, 'index.html');
        }

        fs.stat(filePath, (err, stats) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
                res.end('404 - File not found');
                return;
            }

            // If it's a directory, try index.html inside it
            if (stats.isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
                    res.end('404 - File not found');
                    return;
                }

                const ext = path.extname(filePath).toLowerCase();

                res.writeHead(200, {
                    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
                    'Cache-Control': 'no-cache'
                });

                res.end(data);
            });
        });
    });
}

function listen(srv, port) {
    return new Promise((resolve, reject) => {
        srv.once('error', reject);
        srv.listen(port, '127.0.0.1', () => {
            srv.removeListener('error', reject);
            resolve(srv.address().port);
        });
    });
}

async function startServer() {
    const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'src');
    server = createGameServer(root);

    try {
        activePort = await listen(server, PREFERRED_PORT);
    } catch (error) {
        if (error.code !== 'EADDRINUSE' && error.code !== 'EACCES') throw error;
        // Port taken by something else: let the OS give us any free port.
        server = createGameServer(root);
        activePort = await listen(server, 0);
    }
    console.log(`Local server running at http://127.0.0.1:${activePort}`);
}

function createWindow() {
    win = new BrowserWindow({
        fullscreen: true,
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.setMenu(null);
    win.on('closed', () => { win = null; });

    win.loadURL(`http://127.0.0.1:${activePort}`);
}

ipcMain.on('close-app', () => {
    app.quit();
});

// Only one copy at a time, otherwise two instances would overwrite each other's save file.
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });

    app.whenReady().then(async () => {
        try {
            await startServer();
            createWindow();
        } catch (error) {
            console.error('Could not start local server:', error);
            app.quit();
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

app.on('window-all-closed', () => {
    writeStoreNow();
    if (server) {
        server.close();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    writeStoreNow();
    if (server) {
        server.close();
    }
});