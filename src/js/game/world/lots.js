/**
 * Zoo minigame: lots ("grunde") and build slots.
 *
 * The zoo grows by buying lots of land. Each built lot adds a fixed number of attraction slots and shop slots
 * (see syncSlotsWithLots). A lot under construction does not count until its timer runs out.
 */

import { Tween } from '../../engine/tween.js';
import { nowSeconds } from './common.js';
import { attractionSlotPosition } from './config-lookups.js';
import { spendAndScore } from './score-and-levels.js';

/** A fresh, empty build slot (type 0 = nothing built yet). */
export const createBuildSlot = (index) => ({ nr: index, type: 0, bygger: false, slut: 0 });

/** Adds the non-saved runtime fields (fade tween, ready flag, action locks) to a slot. */
function ensureSlotRuntime(slot) {
  if (!slot.alfa) {
    slot.alfa = new Tween(0, 30);
    slot.klar = false;
    slot.visTil = 0;
    slot.handling = [false, false];
  }
  return slot;
}

/** Number of lots currently usable (the one under construction does not count yet). */
const usableLotCount = (zoo, now) => zoo.grunde - (now < zoo.lotSlut ? 1 : 0);

/** Makes sure there are enough attraction and shop slots for the usable lots and that all have runtime fields. */
export function syncSlotsWithLots(zoo, now = nowSeconds()) {
  const attractionTarget = zoo.Z.sevaerdighed.prGrund * usableLotCount(zoo, now);
  for (let index = zoo.sev.length; index < attractionTarget; index++) {
    zoo.sev.push(createBuildSlot(index));
  }
  zoo.sev.forEach(ensureSlotRuntime);
  const shopTarget = zoo.Z.bod.prGrund * usableLotCount(zoo, now);
  for (let index = zoo.boder.length; index < shopTarget; index++) {
    zoo.boder.push(createBuildSlot(index));
  }
  zoo.boder.forEach(ensureSlotRuntime);
}

/** Width of the zoo world in pixels (x of the next free attraction slot). */
export const worldWidth = (zoo) => attractionSlotPosition(zoo.Z, zoo.sev.length).x;

/** Number of lots bought beyond the first one. */
export const builtLotCount = (zoo) => zoo.grunde - 1;

/** True if more lots can still be bought. */
export const hasMoreLots = (zoo) => zoo.grunde < zoo.Z.regler.grunde.length;

/** Config of the next lot to buy, or null. */
export const nextLot = (zoo) => zoo.Z.regler.grunde[zoo.grunde] || null;

/** True while the newest lot is still under construction (at least 1 s left). */
export const isLotBuilding = (zoo, now) => zoo.lotSlut - now >= 1;

/** Buys the next lot. Returns true, false (not possible) or "penge" (not enough money). */
export function buyLot(zoo, player, now) {
  const lot = nextLot(zoo);
  if (!lot || isLotBuilding(zoo, now)) {
    return false;
  }
  if (!spendAndScore(zoo, player, lot.pris)) {
    return "penge";
  }
  zoo.grunde += 1;
  zoo.lotSlut = now + lot.byggetid;
  zoo.lyde.push(zoo.Z.lyde.byg);
  return true;
}

/** Advances the lot construction animation state (0 idle, 1 building, 2 nothing more to buy). */
export function updateLotAnimation(zoo, now) {
  const remaining = zoo.lotSlut - now;
  if (zoo.lotFilm === 0 && remaining >= 1) {
    zoo.lotFilm = 1;
  } else if (zoo.lotFilm === 1 && remaining <= 0) {
    syncSlotsWithLots(zoo, now);
    zoo.lotFilm = hasMoreLots(zoo) ? 0 : 2;
  } else if (!hasMoreLots(zoo) && zoo.lotFilm === 0) {
    zoo.lotFilm = 2;
  }
}
