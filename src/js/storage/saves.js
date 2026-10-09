import "./persist.js";
// Multiple save slots.
// The game itself reads/writes plain localStorage keys. Once a slot is activated, every
// game key is transparently redirected to "slot:<id>:<key>", so each slot is fully isolated
// and the rest of the game code does not need to know about slots at all.
// localStorage key holding the slot list: { slots: [{ id, navn (name), oprettet (created ms), sidst (last played ms) }] }.
const META_KEY = "stjernehotellet-gemmer-v1";
// sessionStorage key remembering which slot this tab is playing (so a reload stays in the same slot).
const ACTIVE_KEY = "stjernehotellet-aktiv-gem";
// The game's own localStorage keys; only these are redirected into the active slot.
const GAME_KEYS = ["stjernehotellet-gemt-v1", "zoo-gemt-v1", "zoo-gemt-v2", "popstars-gem-v1", "platform-naaet-v1", "vejledninger-set-v1"];
// Main save key (hotel progress); also the key whose writes mark a slot as recently played.
export const SAVE_KEY_MAIN = "stjernehotellet-gemt-v1";
export const MAX_SLOTS = 8; // maximum number of save slots

export const MAX_NAME_LENGTH = 12; // maximum characters in a slot name

// Original Storage methods, kept so slot bookkeeping can bypass the redirection installed by activateSlot().
const rawGet = Storage.prototype.getItem;
const rawSet = Storage.prototype.setItem;
const rawRemove = Storage.prototype.removeItem;
// True only for localStorage (sessionStorage is never redirected).
const isLocal = (storage) => storage === window.localStorage;

// Read the slot list (empty list if missing or corrupt).
function readMeta() {
  try {
    const meta = JSON.parse(rawGet.call(localStorage, META_KEY));
    if (meta && Array.isArray(meta.slots)) return meta;
  } catch {}
  return { slots: [] };
}
// Persist the slot list (errors, e.g. storage full, are ignored).
function writeMeta(meta) {
  try { rawSet.call(localStorage, META_KEY, JSON.stringify(meta)); } catch {}
}
// Key prefix of all data belonging to slot `id`.
const prefix = (id) => `slot:${id}:`;

// Move pre-existing single-save data (from before slots existed) into a first slot.
function migrateLegacy() {
  const meta = readMeta();
  if (meta.slots.length) return;
  const legacy = GAME_KEYS.filter((key) => rawGet.call(localStorage, key) !== null);
  if (!legacy.length) return;
  const id = newId();
  for (const key of legacy) {
    rawSet.call(localStorage, prefix(id) + key, rawGet.call(localStorage, key));
    rawRemove.call(localStorage, key);
  }
  const now = Date.now();
  meta.slots.push({ id, navn: "SPILLER 1", oprettet: now, sidst: now });
  writeMeta(meta);
}
// Short unique slot id (timestamp + random suffix, base 36).
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// All slots, most recently played first, each with a preview of its save: penge (money) and
// etager (number of floors), or null when the slot has no readable save yet.
export function listSlots() {
  migrateLegacy();
  return readMeta().slots.map((slot) => {
    let penge = null, etager = null;
    try {
      const saveData = JSON.parse(rawGet.call(localStorage, prefix(slot.id) + SAVE_KEY_MAIN));
      if (saveData) { penge = saveData.penge ?? null; etager = Array.isArray(saveData.etager) ? saveData.etager.length : null; }
    } catch {}
    return { ...slot, penge, etager };
  }).sort((slotA, slotB) => slotB.sidst - slotA.sidst);
}

// Create a new slot (name trimmed, default "SPILLER"). Returns its id, or null when MAX_SLOTS is reached.
export function createSlot(navn) {
  const meta = readMeta();
  if (meta.slots.length >= MAX_SLOTS) return null;
  const now = Date.now();
  const slot = { id: newId(), navn: (navn || "").trim().slice(0, MAX_NAME_LENGTH) || "SPILLER", oprettet: now, sidst: now };
  meta.slots.push(slot);
  writeMeta(meta);
  return slot.id;
}

// Delete a slot and all its saved game data; clears the active slot if it was the one deleted.
export function deleteSlot(id) {
  const meta = readMeta();
  meta.slots = meta.slots.filter((slot) => slot.id !== id);
  writeMeta(meta);
  for (const key of GAME_KEYS) rawRemove.call(localStorage, prefix(id) + key);
  if (getActiveSlotId() === id) clearActiveSlot();
}

// Rename a slot (an empty name keeps the old one).
export function renameSlot(id, navn) {
  const meta = readMeta();
  const slot = meta.slots.find((candidate) => candidate.id === id);
  if (slot) { slot.navn = (navn || "").trim().slice(0, MAX_NAME_LENGTH) || slot.navn; writeMeta(meta); }
}

// Id of the slot this tab is playing, or null if none/unknown.
export function getActiveSlotId() {
  try {
    const id = sessionStorage.getItem(ACTIVE_KEY);
    return id && readMeta().slots.some((slot) => slot.id === id) ? id : null;
  } catch { return null; }
}
// Forget the active slot for this tab (back to the slot picker).
export function clearActiveSlot() {
  try { sessionStorage.removeItem(ACTIVE_KEY); } catch {}
}

let installed = null; // id of the slot whose redirection has been installed (once per page load)
let lastTouch = 0; // time of the last "last played" update, to limit metadata writes
// Update the slot's "last played" time, at most once every 10 seconds.
function touch(id) {
  const now = Date.now();
  if (now - lastTouch < 10000) return;
  lastTouch = now;
  const meta = readMeta();
  const slot = meta.slots.find((candidate) => candidate.id === id);
  if (slot) { slot.sidst = now; writeMeta(meta); }
}

// Redirect the game's storage keys to the chosen slot. Safe to call once per page load.
export function activateSlot(id) {
  if (installed) return;
  installed = id;
  try { sessionStorage.setItem(ACTIVE_KEY, id); } catch {}
  const slotPrefix = prefix(id);
  const redirectKey = (key) => (GAME_KEYS.includes(key) ? slotPrefix + key : key);
  Storage.prototype.getItem = function (key) { return rawGet.call(this, isLocal(this) ? redirectKey(key) : key); };
  Storage.prototype.setItem = function (key, value) {
    if (isLocal(this) && key === SAVE_KEY_MAIN) touch(id);
    return rawSet.call(this, isLocal(this) ? redirectKey(key) : key, value);
  };
  Storage.prototype.removeItem = function (key) { return rawRemove.call(this, isLocal(this) ? redirectKey(key) : key); };
  window.addEventListener("pagehide", () => { lastTouch = 0; touch(id); });
}
