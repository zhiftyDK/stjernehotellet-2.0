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
  const ls = window.localStorage;
  const isLocal = (s) => s === ls;

  let snapshot = null;
  try { snapshot = bridge.loadSync(); } catch (e) { console.warn("Could not read save file", e); }

  // The save file is the only source of truth. Whatever the browser storage of this (or any earlier)
  // localhost origin holds is thrown away, so nothing can leak in from there. No file yet = empty start.
  rawClear.call(ls);
  if (snapshot && snapshot.data) {
    for (const [k, v] of Object.entries(snapshot.data)) rawSet.call(ls, k, String(v));
  }

  // From now on every write is mirrored to the file (the main process batches and writes atomically).
  Storage.prototype.setItem = function (k, v) {
    const r = rawSet.call(this, k, v);
    if (isLocal(this)) { try { bridge.set(String(k), String(v)); } catch {} }
    return r;
  };
  Storage.prototype.removeItem = function (k) {
    const r = rawRemove.call(this, k);
    if (isLocal(this)) { try { bridge.remove(String(k)); } catch {} }
    return r;
  };
  Storage.prototype.clear = function () {
    const r = rawClear.call(this);
    if (isLocal(this)) { try { bridge.replaceAll({}); } catch {} }
    return r;
  };
} else if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
  // Website: ask the browser not to evict our saves under storage pressure (best effort, may be ignored).
  navigator.storage.persist().catch(() => {});
}
