/**
 * Zoo minigame: creating, saving and loading the zoo state.
 * Property names of the serialized form are kept (they live in save files).
 */

import { createNests, createAnimal } from './animals.js';
import { fillEmptyItemSlots } from './attractions.js';
import { nowSeconds } from './common.js';
import { attractionConfig, animalConfig, itemConfig, shopConfig, wareConfig } from './config-lookups.js';
import { createBuildSlot, syncSlotsWithLots } from './lots.js';
import { scoreForPrice } from './score-and-levels.js';

/** Creates a brand new zoo state for the given configuration. */
export function createZooState(zooConfig) {
  const zoo = {
    Z: zooConfig, // static zoo configuration (data tables)
    grunde: 1, // number of owned lots (land plots)
    sev: [], // attraction slots
    dyr: [], // animals
    reder: createNests(zooConfig), // nests (for baby animals)
    genstande: [], // decoration items (placed and in storage)
    boder: [], // shop slots
    varer: [], // wares (placed in shops and in storage)
    naesteId: 0, // next animal id
    lyde: [], // queue of sound ids to be played by the UI
    effekter: [],
    rest: 0, // leftover ms not yet consumed by fixed simulation steps
    film: () => null, // clip factory, replaced by the Zoo screen
    gaester: [], // guests walking around
    balloner: [], // balloons floating by
    ballonTid: 0, // next balloon spawn time (seconds)
    score: 0,
    lotSlut: 0, // time (seconds) when the lot under construction is done
    lotFilm: 0, // lot construction animation state: 0 idle, 1 building, 2 no more lots
  };
  syncSlotsWithLots(zoo);
  return zoo;
}

/** Extracts the persistent part of the zoo state for the save file (runtime fields are dropped). */
export function serializeZooState(zoo) {
  return {
    grunde: zoo.grunde,
    lotSlut: zoo.lotSlut,
    score: zoo.score,
    naesteId: zoo.naesteId,
    sev: zoo.sev.map(({ type, bygger: building, slut: endTime }) => ({ type, bygger: building, slut: endTime })),
    dyr: zoo.dyr.map(({ id, sev: attractionIndex, type, f: form, slut: endTime, leveret: delivered }) => ({ id, sev: attractionIndex, type, f: form, slut: endTime, leveret: delivered })),
    reder: zoo.reder.map(({ laast: locked, sev: attractionIndex, f: form }) => ({ laast: locked, sev: attractionIndex, f: form })),
    genstande: zoo.genstande.map(({ sev: attractionIndex, plads: slotIndex, kat: category, f: form, slut: endTime }) => ({ sev: attractionIndex, plads: slotIndex, kat: category, f: form, slut: endTime })),
    boder: zoo.boder.map(({ type, bygger: building, slut: endTime }) => ({ type, bygger: building, slut: endTime })),
    varer: zoo.varer.map(({ bod: shopIndex, type, f: form }) => ({ bod: shopIndex, type, f: form })),
  };
}

/** Rebuilds a zoo state from saved data, tolerating missing or outdated parts; recomputes the score if absent. */
export function loadZooState(zooConfig, saved, now = nowSeconds()) {
  const zoo = createZooState(zooConfig);
  if (!saved || !Array.isArray(saved.sev)) {
    return zoo;
  }
  zoo.grunde = Math.min(saved.grunde || 1, zooConfig.regler.grunde.length);
  zoo.lotSlut = saved.lotSlut || 0;
  zoo.naesteId = saved.naesteId || 0;
  zoo.sev = saved.sev.map((slotSave, index) => ({ ...createBuildSlot(index), ...slotSave }));
  if (Array.isArray(saved.boder)) {
    zoo.boder = saved.boder.map((shopSave, index) => ({ ...createBuildSlot(index), ...shopSave }));
  }
  if (Array.isArray(saved.varer)) {
    zoo.varer = saved.varer.filter((ware) => zooConfig.bod.vare.film[ware.type]);
  }
  syncSlotsWithLots(zoo, now);
  for (const animalSave of saved.dyr || []) {
    if (zoo.sev[animalSave.sev] && zooConfig.dyr.film[animalSave.type]) {
      zoo.dyr.push(createAnimal(zoo, animalSave));
    }
  }
  if (Array.isArray(saved.reder)) {
    saved.reder.forEach((nestSave, index) => {
      if (zoo.reder[index]) {
        Object.assign(zoo.reder[index], nestSave);
      }
    });
  }
  if (Array.isArray(saved.genstande)) {
    zoo.genstande = saved.genstande.filter((item) => zoo.Z.genstand.film[item.kat]);
  }
  for (const attraction of zoo.sev) {
    if (attraction.type) {
      fillEmptyItemSlots(zoo, attraction.nr, 0);
    }
  }
  zoo.score = typeof saved.score == "number" ? saved.score : computeScoreFromAssets(zoo);
  return zoo;
}

/** Score for old saves without one: sum of the score values of everything the player owns. */
function computeScoreFromAssets(zoo) {
  const zooConfig = zoo.Z;
  const toScore = (price) => scoreForPrice(zooConfig, price || 0);
  let total = 0;
  for (const attraction of zoo.sev) {
    if (attraction.type) {
      total += toScore(attractionConfig(zooConfig, attraction.type).pris);
    }
  }
  for (const animal of zoo.dyr) {
    if (animal.f > 0) {
      total += toScore(animalConfig(zooConfig, animal.type, animal.f).pris);
    }
  }
  zoo.reder.forEach((nest, index) => {
    if (!nest.laast && index > 0) {
      total += toScore(zooConfig.regler.reder[index]);
    }
  });
  for (const item of zoo.genstande) {
    if (item.kat >= 2) {
      total += toScore((itemConfig(zooConfig, item.kat, item.f) || {}).pris);
    }
  }
  for (const shop of zoo.boder) {
    if (shop.type >= 1) {
      total += toScore(shopConfig(zooConfig, shop.type).pris);
    }
  }
  for (const ware of zoo.varer) {
    if (ware.f > 0) {
      total += toScore((wareConfig(zooConfig, ware.type, ware.f) || {}).pris);
    }
  }
  for (let lotIndex = 1; lotIndex < zoo.grunde; lotIndex++) {
    total += toScore(zooConfig.regler.grunde[lotIndex].pris);
  }
  return total;
}
