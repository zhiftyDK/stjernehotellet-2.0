/**
 * Zoo minigame: attractions ("sevaerdigheder") and their decoration items ("genstande").
 *
 * An attraction is bought into a slot, built for a while, and then periodically pays out coins
 * based on the animals living there. Each attraction type has item slots that can hold decorations.
 */

import { animalsAtAttraction, createAnimal } from './animals.js';
import { attractionConfig, animalConfig, itemConfig } from './config-lookups.js';
import { spendAndScore, attractionUnlockLevel, isLockedAtLevel } from './score-and-levels.js';

/** Buys an attraction into an empty slot. Returns true / false / "laast" (level too low) / "penge". */
export function buyAttraction(zoo, player, slotIndex, type, now) {
  const slot = zoo.sev[slotIndex];
  if (!slot || slot.type !== 0 || !zoo.Z.dyr.film[type]) {
    return false;
  }
  if (isLockedAtLevel(zoo, attractionUnlockLevel(zoo.Z, type))) {
    return "laast";
  }
  if (!spendAndScore(zoo, player, attractionConfig(zoo.Z, type).pris)) {
    return "penge";
  }
  Object.assign(slot, { type: type, bygger: true, slut: now + attractionConfig(zoo.Z, type).byggetid });
  zoo.naesteId += 1;
  // The first animal of a new attraction is delivered immediately.
  zoo.dyr.push(createAnimal(zoo, { id: zoo.naesteId, sev: slotIndex, type: type, f: 0, slut: now, leveret: true }));
  fillEmptyItemSlots(zoo, slotIndex, now);
  zoo.lyde.push(zoo.Z.lyde.byg);
  return true;
}

/** Decoration item slots of an attraction (empty list if nothing is built). */
export const itemSlotsOf = (zoo, attractionIndex) =>
  zoo.sev[attractionIndex] && zoo.sev[attractionIndex].type ? zoo.Z.regler.pladser[zoo.sev[attractionIndex].type] : [];

/** The item placed in a given slot of an attraction, or null. */
export const itemInSlot = (zoo, attractionIndex, slotIndex) => zoo.genstande.find((item) => item.sev === attractionIndex && item.plads === slotIndex) || null;

/** How many unplaced items (sev < 0) of this category/form are in storage. */
export const countStoredItems = (zoo, category, form) => zoo.genstande.filter((item) => item.sev < 0 && item.kat === category && item.f === form).length;

/** Gives every empty item slot of an attraction a default "empty" item (category 0). */
export function fillEmptyItemSlots(zoo, attractionIndex, now) {
  itemSlotsOf(zoo, attractionIndex).forEach((slotDef, slotIndex) => {
    if (!itemInSlot(zoo, attractionIndex, slotIndex)) {
      zoo.genstande.push({ sev: attractionIndex, plads: slotIndex, kat: 0, f: slotDef.tom, slut: now });
    }
  });
}

// Places an item in a slot (using a stored one if available, otherwise buying it). Returns true / false / "penge".
export function placeItem(zoo, player, attractionIndex, slotIndex, form, now) {
  const slotDef = itemSlotsOf(zoo, attractionIndex)[slotIndex];
  const current = itemInSlot(zoo, attractionIndex, slotIndex);
  if (!slotDef || current && current.kat === slotDef.kat && current.f === form) {
    return false;
  }
  const spare = zoo.genstande.find((item) => item.sev < 0 && item.kat === slotDef.kat && item.f === form);
  if (!spare) {
    const itemCfg = itemConfig(zoo.Z, slotDef.kat, form);
    if (!itemCfg || !spendAndScore(zoo, player, itemCfg.pris)) {
      return "penge";
    }
  }
  if (current) {
    if (current.kat === 0) {
      zoo.genstande.splice(zoo.genstande.indexOf(current), 1);
    } else {
      current.sev = -1;
      current.plads = -1;
    }
  }
  if (spare) {
    Object.assign(spare, { sev: attractionIndex, plads: slotIndex });
  } else {
    zoo.genstande.push({ sev: attractionIndex, plads: slotIndex, kat: slotDef.kat, f: form, slut: now + itemConfig(zoo.Z, slotDef.kat, form).byggetid });
  }
  return true;
}

/** Finishes the construction of an attraction when its timer is done and starts the payout timer. */
export function finishAttractionBuild(zoo, attractionIndex, now) {
  const attraction = zoo.sev[attractionIndex];
  if (!attraction || !attraction.bygger || now < attraction.slut) {
    return false;
  }
  attraction.bygger = false;
  attraction.slut = now + attractionConfig(zoo.Z, attraction.type).udbetalingstid;
  zoo.lyde.push(zoo.Z.lyde.faerdig);
  return true;
}

// Collects coins from an attraction when its payout timer is over; returns the amount, or 0 (and shows the countdown) when not ready.
export function collectAttractionIncome(zoo, player, attractionIndex, now) {
  const attraction = zoo.sev[attractionIndex];
  if (now <= attraction.slut) {
    attraction.visTil = now + zoo.Z.sevaerdighed.nedtaelling.vis;
    return 0;
  }
  attraction.slut = now + attractionConfig(zoo.Z, attraction.type).udbetalingstid;
  const income = animalsAtAttraction(zoo, attractionIndex).filter((animal) => now >= animal.slut).reduce((sum, animal) => sum + animalConfig(zoo.Z, animal.type, animal.f).udbetaling, 0);
  if (income > 0) {
    player.faa(income);
  }
  return income;
}
