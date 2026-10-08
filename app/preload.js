const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    closeApp: () => ipcRenderer.send('close-app'),
    // Save storage (file in the user-data folder, see app.js)
    storage: {
        loadSync: () => ipcRenderer.sendSync('storage-load-sync'),
        set: (key, value) => ipcRenderer.send('storage-set', key, value),
        remove: (key) => ipcRenderer.send('storage-remove', key),
        replaceAll: (all) => ipcRenderer.send('storage-replace', all)
    }
});