import "./persist.js";
// Multiple save slots.
// The game itself reads/writes plain localStorage keys. Once a slot is activated, every
// game key is transparently redirected to "slot:<id>:<key>", so each slot is fully isolated
// and the rest of the game code does not need to know about slots at all.
const META_KEY = "stjernehotellet-gemmer-v1";
const ACTIVE_KEY = "stjernehotellet-aktiv-gem";
const GAME_KEYS = ["stjernehotellet-gemt-v1", "zoo-gemt-v1", "zoo-gemt-v2", "popstars-gem-v1", "platform-naaet-v1", "vejledninger-set-v1"];
export const SAVE_KEY_MAIN = "stjernehotellet-gemt-v1";
export const MAX_SLOTS = 8;
export const MAX_NAME_LENGTH = 12;

const rawGet = Storage.prototype.getItem;
const rawSet = Storage.prototype.setItem;
const rawRemove = Storage.prototype.removeItem;
const isLocal = (s) => s === window.localStorage;

function readMeta() {
  try {
    const m = JSON.parse(rawGet.call(localStorage, META_KEY));
    if (m && Array.isArray(m.slots)) return m;
  } catch {}
  return { slots: [] };
}
function writeMeta(m) {
  try { rawSet.call(localStorage, META_KEY, JSON.stringify(m)); } catch {}
}
const prefix = (id) => `slot:${id}:`;

// Move pre-existing single-save data (from before slots existed) into a first slot.
function migrateLegacy() {
  const meta = readMeta();
  if (meta.slots.length) return;
  const legacy = GAME_KEYS.filter((k) => rawGet.call(localStorage, k) !== null);
  if (!legacy.length) return;
  const id = newId();
  for (const k of legacy) {
    rawSet.call(localStorage, prefix(id) + k, rawGet.call(localStorage, k));
    rawRemove.call(localStorage, k);
  }
  const now = Date.now();
  meta.slots.push({ id, navn: "SPILLER 1", oprettet: now, sidst: now });
  writeMeta(meta);
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function listSlots() {
  migrateLegacy();
  return readMeta().slots.map((s) => {
    let penge = null, etager = null;
    try {
      const d = JSON.parse(rawGet.call(localStorage, prefix(s.id) + SAVE_KEY_MAIN));
      if (d) { penge = d.penge ?? null; etager = Array.isArray(d.etager) ? d.etager.length : null; }
    } catch {}
    return { ...s, penge, etager };
  }).sort((a, b) => b.sidst - a.sidst);
}

export function createSlot(navn) {
  const meta = readMeta();
  if (meta.slots.length >= MAX_SLOTS) return null;
  const now = Date.now();
  const slot = { id: newId(), navn: (navn || "").trim().slice(0, MAX_NAME_LENGTH) || "SPILLER", oprettet: now, sidst: now };
  meta.slots.push(slot);
  writeMeta(meta);
  return slot.id;
}

export function deleteSlot(id) {
  const meta = readMeta();
  meta.slots = meta.slots.filter((s) => s.id !== id);
  writeMeta(meta);
  for (const k of GAME_KEYS) rawRemove.call(localStorage, prefix(id) + k);
  if (getActiveSlotId() === id) clearActiveSlot();
}

export function renameSlot(id, navn) {
  const meta = readMeta();
  const s = meta.slots.find((x) => x.id === id);
  if (s) { s.navn = (navn || "").trim().slice(0, MAX_NAME_LENGTH) || s.navn; writeMeta(meta); }
}

export function getActiveSlotId() {
  try {
    const id = sessionStorage.getItem(ACTIVE_KEY);
    return id && readMeta().slots.some((s) => s.id === id) ? id : null;
  } catch { return null; }
}
export function clearActiveSlot() {
  try { sessionStorage.removeItem(ACTIVE_KEY); } catch {}
}

let installed = null;
let lastTouch = 0;
function touch(id) {
  const now = Date.now();
  if (now - lastTouch < 10000) return;
  lastTouch = now;
  const meta = readMeta();
  const s = meta.slots.find((x) => x.id === id);
  if (s) { s.sidst = now; writeMeta(meta); }
}

// Redirect the game's storage keys to the chosen slot. Safe to call once per page load.
export function activateSlot(id) {
  if (installed) return;
  installed = id;
  try { sessionStorage.setItem(ACTIVE_KEY, id); } catch {}
  const p = prefix(id);
  const map = (k) => (GAME_KEYS.includes(k) ? p + k : k);
  Storage.prototype.getItem = function (k) { return rawGet.call(this, isLocal(this) ? map(k) : k); };
  Storage.prototype.setItem = function (k, v) {
    if (isLocal(this) && k === SAVE_KEY_MAIN) touch(id);
    return rawSet.call(this, isLocal(this) ? map(k) : k, v);
  };
  Storage.prototype.removeItem = function (k) { return rawRemove.call(this, isLocal(this) ? map(k) : k); };
  window.addEventListener("pagehide", () => { lastTouch = 0; touch(id); });
}
