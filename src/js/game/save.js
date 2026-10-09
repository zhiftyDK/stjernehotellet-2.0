import { createFloorFurniture } from './furniture-and-kitchen.js';
// Local persistence of the hotel game (localStorage): the saved hotel, the "tutorials seen" flags,
// and a helper that wipes every game-related key (including the minigames' saves).

// localStorage key holding { tutorialId: true } for tutorials the player has already seen.
export const TUTORIALS_SEEN_KEY = "vejledninger-set-v1";
// Reads the seen-tutorials map; an empty object when missing or unreadable.
export const readTutorialsSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(TUTORIALS_SEEN_KEY)) || {};
  }
  catch {
    return {};
  }
};
// Tutorial flags: har(id) = has the tutorial been seen, saet(id) = mark it as seen and persist it.
export const tutorials = { har(id) {
    return !!readTutorialsSeen()[id];
  }, saet(id) {
    const seen = readTutorialsSeen();
    seen[id] = true;
    try {
      localStorage.setItem(TUTORIALS_SEEN_KEY, JSON.stringify(seen));
    }
    catch {
    }
  } };
// localStorage key of the saved hotel.
export const SAVE_KEY = "stjernehotellet-gemt-v1";
// Serializable form of a pet room entry: pet identity and points, time left until its reward is ready, and owned items.
export const serializePetEntry = (state, entry) => ({ nr: entry.dyr.nr, navn: entry.dyr.navn, point: entry.dyr.point, klarRest: Math.max(0, entry.dyr.klarTid - state.tid), varer: entry.varer.map((item) => ({ type: item.type, f: item.f, rest: item.rest })) });
// Serializable form of one floor: type, build status/time, furniture, and the cafe or pet entry if present.
// A pet floor that was loaded but not yet turned into a live pet keeps its saved data (kaeledyrGemt).
export const serializeFloor = (state, floor) => ({ type: floor.type, status: floor.status, byggeTid: floor.byggeTid, moebler: floor.moebler, ...floor.cafe ? { cafe: floor.cafe } : {}, ...floor.kaeledyr ? { kaeledyr: serializePetEntry(state, floor.kaeledyr) } : floor.kaeledyrGemt ? { kaeledyr: floor.kaeledyrGemt } : {} });
// Writes the hotel (money, time, music, achievements, safe codes, floors and VIP guests still around) to localStorage.
export function serializeHotel(state) {
  const snapshot = { penge: state.penge, hentet: state.hentet, tid: state.tid, musik: state.musik, bedrifter: state.bedrifter || [], pengeskab: state.pengeskab || [], etager: state.etager.map((floor) => serializeFloor(state, floor)), kendte: state.etager.flatMap((floor) => floor.gaester).filter((guest) => guest.vip != null && guest.fase !== "ud").map((guest) => ({ vip: guest.vip, etage: guest.til, rest: guest.fase === "ophold" ? Math.max(0, guest.opholdTid) : null })) };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  }
  catch {
  }
}
// Restores the hotel from localStorage into `e`. Returns false when there is no valid save. Guests are not saved (gaester reset); furniture is matched back onto each floor type's fixed layout.
export function deserializeHotel(state) {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  }
  catch {
    saved = null;
  }
  if (!saved || !Array.isArray(saved.etager) || !saved.etager.length) {
    return false;
  }
  state.penge = saved.penge ?? state.penge;
  state.hentet = saved.hentet ?? state.hentet;
  state.tid = saved.tid ?? state.tid;
  if (saved.musik !== void 0) {
    state.musik = saved.musik;
  }
  if (Array.isArray(saved.bedrifter)) {
    state.bedrifter = saved.bedrifter;
  }
  if (Array.isArray(saved.pengeskab)) {
    state.pengeskab = saved.pengeskab;
  }
  if (Array.isArray(saved.kendte) && saved.kendte.length) {
    state.kendteGemt = saved.kendte;
  }
  state.etager = saved.etager.map((savedFloor, _index) => {
    // Saved furniture is matched by type onto the floor type's fixed layout (positions come from the layout; the
    // saved pieces keep their purchased feature/delivery state). naeste/paaVej (transient movement state) are dropped.
    const unmatchedSaved = [...savedFloor.moebler || []], freshFurniture = createFloorFurniture(savedFloor.type).map((slot) => {
      const savedIndex = unmatchedSaved.findIndex((candidate) => candidate && candidate.type === slot.type);
      if (savedIndex < 0) {
        return slot;
      }
      const savedPiece = unmatchedSaved[savedIndex];
      unmatchedSaved[savedIndex] = null;
      return { ...savedPiece, x: slot.x, y: slot.y, fast: slot.fast, iBrug: false };
    }), { naeste: _naeste, paaVej: _paaVej, kaeledyr: savedPet, ...floorRest } = savedFloor;
    return { ...floorRest, gaester: [], moebler: freshFurniture, ...savedPet ? { kaeledyrGemt: savedPet } : {} };
  });
  return true;
}
// Every localStorage key the game (and its minigames) use.
const ALL_STORAGE_KEYS = [SAVE_KEY, "zoo-gemt-v1", "zoo-gemt-v2", "popstars-gem-v1", "platform-naaet-v1", "vejledninger-set-v1"];
// Deletes all saved data (new game).
export function clearAllSavedData() {
  for (const key of ALL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    }
    catch {
    }
  }
}
