// Where the game's saves physically live.
//
// Website:  plain localStorage (per origin), nothing special needed.
// Electron: localStorage is only a fast in-memory cache. The real copy is a JSON file in the app's
//           user-data folder, written by the main process (see electron/app.js + preload.js).
//           Saves never depend on the localhost port/origin, and nothing is ever read from the old
//           browser storage: only the file counts.
//
// This module must run before anything else touches Storage.prototype (saves.js imports it first).
const bridge = (typeof window !== "undefined" && window.electronAPI && window.electronAPI.storage) || null;

if (bridge) {
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  const rawClear = Storage.prototype.clear;
  const localStore = window.localStorage;
  const isLocal = (storage) => storage === localStore;

  let snapshot = null;
  try { snapshot = bridge.loadSync(); } catch (error) { console.warn("Could not read save file", error); }

  // The save file is the only source of truth. Whatever the browser storage of this (or any earlier)
  // localhost origin holds is thrown away, so nothing can leak in from there. No file yet = empty start.
  rawClear.call(localStore);
  if (snapshot && snapshot.data) {
    for (const [key, value] of Object.entries(snapshot.data)) rawSet.call(localStore, key, String(value));
  }

  // From now on every write is mirrored to the file (the main process batches and writes atomically).
  Storage.prototype.setItem = function (key, value) {
    const result = rawSet.call(this, key, value);
    if (isLocal(this)) { try { bridge.set(String(key), String(value)); } catch {} }
    return result;
  };
  Storage.prototype.removeItem = function (key) {
    const result = rawRemove.call(this, key);
    if (isLocal(this)) { try { bridge.remove(String(key)); } catch {} }
    return result;
  };
  Storage.prototype.clear = function () {
    const result = rawClear.call(this);
    if (isLocal(this)) { try { bridge.replaceAll({}); } catch {} }
    return result;
  };
} else if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
  // Website: ask the browser not to evict our saves under storage pressure (best effort, may be ignored).
  navigator.storage.persist().catch(() => {});
}
