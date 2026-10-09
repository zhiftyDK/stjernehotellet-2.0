/**
 * Persistent band/shop state of the Popstars minigame and all rules for changing it.
 *
 * The save object (stored in localStorage under SAVE_KEY) contains:
 *   genstande = stage items (instruments, amps ...) placed in slots (`plads`, -1 = in storage),
 *   toej      = clothing/instrument pieces owned or worn (`medlem` = band member index, -1 = owned but unworn),
 *   band      = one entry per band member, sange = which songs are bought,
 *   koncerter/point/rekord = concerts played, total points, best score,
 *   forsoeg/ventTil = remaining concert attempts and the time (unix seconds) until which the player must wait.
 * Purchase functions return true (done), false (nothing to do) or "penge" (not enough money).
 * The wallet is any object with penge (balance), brug(n) (spend, returns success) and faa(n) (earn).
 */
// localStorage key of the saved band.
export const SAVE_KEY = "popstars-gem-v1";
// Current unix time in whole seconds (used for build timers and the concert cooldown).
export const nowSeconds = () => Math.floor(Date.now() / 1e3);
// Default clothes for band member `memberIndex`: one piece of each type 1..6 (from the standard outfit)
// plus the first instrument (type 7..11) that no other member already plays.
export function createMemberOutfit(clothingData, save, memberIndex) {
  const defaults = clothingData.standard[memberIndex];
  const takenInstruments = new Set(save.toej.filter((piece) => piece.medlem >= 0 && piece.type >= 7).map((piece) => piece.type));
  const freeInstrument = [defaults.instrument, 7, 8, 9, 10, 11].find((instrumentType) => !takenInstruments.has(instrumentType));
  return [...[1, 2, 3, 4, 5, 6].map((typeId) => ({ type: typeId, f: defaults[typeId] || 0, medlem: memberIndex })), { type: freeInstrument, f: 0, medlem: memberIndex }];
}
// A brand-new band: one member, first song unlocked, default items placed by ensureDefaultItems.
export function createDefaultSave(clothingData) {
  const save = { genstande: [], toej: [], band: [{}], sange: [true, false, false, false, false], koncerter: 0, point: 0, rekord: 0, forsoeg: 0, ventTil: 0 };
  save.toej.push(...createMemberOutfit(clothingData, save, 0));
  return save;
}
// Loads the save from localStorage (falling back to a fresh band), migrates old saves that have no `toej` list,
// and makes sure every slot has its default item. Money and stage are not stored here (they live in the game wallet).
export function loadSave(itemData, clothingData) {
  let save = createDefaultSave(clothingData);
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (stored && stored.band) {
      const { penge: droppedMoney, scene: droppedStage, ...storedRest } = stored;
      save = { ...save, ...storedRest };
      if (!stored.toej) {
        save.toej = [];
        save.band.forEach((member, memberIndex) => {
          save.toej.push(...createMemberOutfit(clothingData, save, memberIndex));
          if (member.instrument != null) {
            save.toej.find((piece) => piece.medlem === memberIndex && piece.type >= 7).type = 7 + member.instrument;
          }
          delete member.instrument;
        });
      }
    }
  }
  catch {
  }
  ensureDefaultItems(itemData, save);
  return save;
}
// Writes the save to localStorage (silently ignores storage errors).
export function persistSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }
  catch {
  }
}
// Spends `cost` from the wallet; on success also awards points (one point per `kronerPerPoint` spent, at least 1).
export function payAndScore(save, wallet, cost, kronerPerPoint) {
  if (wallet.brug(cost)) {
    save.point += Math.trunc(cost / kronerPerPoint) || (cost > 0 ? 1 : 0);
    return true;
  }
  return false;
}
// Adds the default item to every stage slot that has none.
export function ensureDefaultItems(itemData, save) {
  for (const slot of itemData.pladser) {
    if (!findItemAtSlot(save, slot.id)) {
      save.genstande.push({ plads: slot.id, type: slot.standard[0], f: slot.standard[1], slut: 0 });
    }
  }
}
// The item placed in slot `slotId`, if any.
export const findItemAtSlot = (save, slotId) => save.genstande.find((item) => item.plads === slotId);
// How many owned-but-unplaced items of this type/variant (`f`) are in storage.
export const countStoredItems = (save, type, variant) => save.genstande.filter((item) => item.plads < 0 && item.type === type && item.f === variant).length;
// An item is "being built" until its finish time `slut` (unix seconds) is reached.
export const isUnderConstruction = (item, nowSec) => item.slut - nowSec >= 1;
// Seconds until construction of `item` finishes (0 when done).
export const constructionSecondsLeft = (item, nowSec) => Math.max(0, item.slut - nowSec);
// Buys (or takes from storage) the ware `variant` and puts it in slot `slotId`; the replaced item goes back to
// storage (except type 0, which is discarded). New items get a finish time of now + build time.
export function placeItem(itemData, save, wallet, slotId, variant, nowSec) {
  const slot = itemData.pladser.find((candidate) => candidate.id === slotId);
  const current = findItemAtSlot(save, slotId);
  if (current && current.type === slot.type && current.f === variant) {
    return false;
  }
  const stored = save.genstande.find((item) => item.plads < 0 && item.type === slot.type && item.f === variant);
  const ware = itemData.varer[slot.type][variant];
  if (!stored && !payAndScore(save, wallet, ware.pris, itemData.kronerPrPoint)) {
    return "penge";
  }
  if (current) {
    if (current.type === 0) {
      save.genstande.splice(save.genstande.indexOf(current), 1);
    } else {
      current.plads = -1;
    }
  }
  if (stored) {
    stored.plads = slotId;
  } else {
    save.genstande.push({ plads: slotId, type: slot.type, f: variant, slut: nowSec + ware.byggetid });
  }
  return true;
}
// Buys the next band member (max 4) and gives them a default outfit.
export function buyBandMember(bandData, clothingData, save, wallet, kronerPerPoint) {
  const memberCount = save.band.length;
  return memberCount >= 4 ? false : payAndScore(save, wallet, bandData.medlemPris[memberCount], kronerPerPoint) ? (save.toej.push(...createMemberOutfit(clothingData, save, memberCount)), save.band.push({}), true) : "penge";
}
// All clothing pieces currently worn by a band member.
export const memberOutfit = (save, memberIndex) => save.toej.filter((piece) => piece.medlem === memberIndex);
// Instrument type (>= 7) a member plays, or null.
export const memberInstrument = (save, memberIndex) => {
  const instrumentPiece = save.toej.find((piece) => piece.medlem === memberIndex && piece.type >= 7);
  return instrumentPiece ? instrumentPiece.type : null;
};
// Instrument types already played by the other members.
export const instrumentsTakenByOthers = (save, memberIndex) => new Set(save.toej.filter((piece) => piece.medlem >= 0 && piece.medlem !== memberIndex && piece.type >= 7).map((piece) => piece.type));
// True if the player owns this piece but nobody wears it right now.
export const ownsClothing = (save, type, variant) => save.toej.some((piece) => piece.medlem < 0 && piece.type === type && piece.f === variant);
// Buys (if new) and dresses member `memberIndex` in the piece (`type`, `variant`); whatever the member wore
// in that slot (any instrument for types >= 7) goes back to storage.
export function equipClothing(clothingData, save, wallet, memberIndex, type, variant, kronerPerPoint) {
  const owned = save.toej.find((piece) => piece.medlem < 0 && piece.type === type && piece.f === variant);
  if (!owned && !payAndScore(save, wallet, clothingData.priser[type][variant], kronerPerPoint)) {
    return "penge";
  }
  for (const piece of save.toej) {
    if (piece.medlem === memberIndex && (type >= 7 ? piece.type >= 7 : piece.type === type)) {
      piece.medlem = -1;
    }
  }
  if (owned) {
    owned.medlem = memberIndex;
  } else {
    save.toej.push({ type: type, f: variant, medlem: memberIndex });
  }
  return true;
}
// Unlocks a song for money.
export function buySong(bandData, save, wallet, songIndex, kronerPerPoint) {
  return save.sange[songIndex] ? false : payAndScore(save, wallet, bandData.sangPris[songIndex], kronerPerPoint) ? (save.sange[songIndex] = true, true) : "penge";
}
// Uses one concert attempt. When none are left, the player must wait until `ventTil`; asking after that grants a
// fresh batch of attempts (and starts the next cooldown). Returns true, or "vent" while still waiting.
export function useConcertAttempt(concertCfg, save, nowSec) {
  if (save.forsoeg >= 1) {
    save.forsoeg -= 1;
    return true;
  }
  if (nowSec < save.ventTil) {
    return "vent";
  }
  save.ventTil = nowSec + concertCfg.ventetid;
  save.forsoeg = concertCfg.forsoeg;
  return true;
}
// Seconds left of the cooldown (only counts while no attempts remain).
export const concertCooldownLeft = (save, nowSec) => save.forsoeg <= 0 ? Math.max(0, save.ventTil - nowSec) : 0;
// Instrument type per lane (null for lanes without a band member).
export const bandInstruments = (save) => [0, 1, 2, 3].map((memberIndex) => save.band[memberIndex] ? memberInstrument(save, memberIndex) : null);
// Books a finished concert: pays the earnings out, counts the concert, adds points, updates the record.
export function recordConcertResult(save, wallet, score) {
  if (score > 0) {
    wallet.faa(score);
  }
  save.koncerter += 1;
  save.point += score;
  if (score > save.rekord) {
    save.rekord = score;
  }
  return score;
}

// Fallback wallet used when the host game does not provide one.
export const createLocalWallet = (startMoney) => ({ penge: startMoney, brug(l) {
    if (this.penge < l) {
      return false;
    }
    this.penge -= l;
    return true;
  }, faa(l) {
    this.penge += l;
  } });
